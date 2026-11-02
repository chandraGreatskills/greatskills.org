"""The feed: posts, likes and comments.

A post is shown to every signed-in member, or to the author's connections
only. Members can post as an organization they're verified staff at, which
is how a university or company publishes campus updates. Logged-out
visitors see no posts."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.abuse import over_limit
from app.api.deps import CurrentUser, DbSession, VerifiedUser
from app.models.connection import Connection
from app.models.organization import Affiliation, Organization
from app.models.post import Post, PostComment, PostLike
from app.models.user import User
from app.schemas.post import CommentIn, CommentOut, PostIn, PostOrg, PostOut
from app.services import demo, network
from app.services.notify import handle_of, name_of, notify

router = APIRouter(prefix="/posts", tags=["posts"])

STAFF = ("faculty", "recruiter")


def _slow():
    return HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You're posting a lot. Wait a while and try again.")


def _blocked(viewer_id: UUID):
    """User ids the viewer has blocked or been blocked by."""
    return select(Connection.addressee_id).where(
        (Connection.requester_id == viewer_id) & (Connection.status == "blocked")
    ).union(
        select(Connection.requester_id).where((Connection.addressee_id == viewer_id) & (Connection.status == "blocked"))
    )


async def _readable(db, viewer: User):
    """The where-clause for posts this viewer may read."""
    mine = network.accepted_with(viewer.id)
    return (
        (Post.author_id.not_in(_blocked(viewer.id)))
        & (await demo.visible(db, viewer, Post.is_synthetic))
        & or_(
            Post.visibility == "members",
            Post.author_id == viewer.id,
            Post.author_id.in_(mine),
        )
    )


async def _staff_orgs(db, user_id: UUID) -> set[UUID]:
    return set(await db.scalars(
        select(Affiliation.org_id).join(Organization, Organization.id == Affiliation.org_id).where(
            Affiliation.user_id == user_id, Affiliation.kind.in_(STAFF),
            Affiliation.status == "verified", Organization.status == "approved",
        )
    ))


async def _out(db, viewer: User, posts: list[Post]) -> list[PostOut]:
    if not posts:
        return []
    ids = [p.id for p in posts]
    authors = await network.minis(db, {p.author_id for p in posts})
    orgs = {o.id: o for o in await db.scalars(select(Organization).where(Organization.id.in_({p.org_id for p in posts if p.org_id})))}
    likes = dict((await db.execute(select(PostLike.post_id, func.count()).where(PostLike.post_id.in_(ids)).group_by(PostLike.post_id))).all())
    comments = dict((await db.execute(select(PostComment.post_id, func.count()).where(PostComment.post_id.in_(ids)).group_by(PostComment.post_id))).all())
    liked = set(await db.scalars(select(PostLike.post_id).where(PostLike.post_id.in_(ids), PostLike.user_id == viewer.id)))
    staff = await _staff_orgs(db, viewer.id)
    out = []
    for p in posts:
        if p.author_id not in authors:
            continue
        org = orgs.get(p.org_id)
        out.append(PostOut(
            id=p.id, body=p.body, visibility=p.visibility, created_at=p.created_at, author=authors[p.author_id],
            org=PostOrg(name=org.name, slug=org.slug, logo_url=org.logo_url, org_type=org.org_type) if org else None,
            likes=likes.get(p.id, 0), liked=p.id in liked, comments=comments.get(p.id, 0),
            can_delete=p.author_id == viewer.id or viewer.role == "admin" or (p.org_id in staff),
            is_demo=p.is_synthetic,
        ))
    return out


async def _post(db, viewer: User, post_id: UUID) -> Post:
    post = await db.scalar(select(Post).where(Post.id == post_id, await _readable(db, viewer)))
    if post is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return post


@router.get("", response_model=list[PostOut])
async def feed(
    current: CurrentUser,
    db: DbSession,
    author: UUID | None = None,
    org: str | None = Query(None, max_length=120),
    before: datetime | None = None,
    limit: int = Query(20, ge=1, le=50),
):
    """Newest first. ?author= for one member's activity, ?org= for an
    organization's updates, ?before= to load older posts."""
    stmt = select(Post).where(await _readable(db, current))
    if author:
        stmt = stmt.where(Post.author_id == author, Post.org_id.is_(None))
    if org:
        stmt = stmt.join(Organization, Organization.id == Post.org_id).where(Organization.slug == org)
    if before:
        stmt = stmt.where(Post.created_at < before)
    posts = list(await db.scalars(stmt.order_by(Post.created_at.desc(), Post.id).limit(limit)))
    return await _out(db, current, posts)


@router.post("", response_model=PostOut, status_code=201)
async def create(payload: PostIn, current: VerifiedUser, db: DbSession):
    if await over_limit("post", str(current.id), 30):
        raise _slow()
    org_id = None
    if payload.org_slug:
        org = await db.scalar(select(Organization).where(Organization.slug == payload.org_slug))
        if org is None or org.id not in await _staff_orgs(db, current.id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can post for an organization only as its verified staff")
        org_id = org.id
    post = Post(
        author_id=current.id, org_id=org_id, body=payload.body.strip(),
        # Organization updates are for everyone; connections-only makes no sense there.
        visibility="members" if org_id else payload.visibility,
        is_synthetic=current.is_synthetic,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return (await _out(db, current, [post]))[0]


@router.delete("/{post_id}", status_code=204)
async def remove(post_id: UUID, current: CurrentUser, db: DbSession):
    post = await _post(db, current, post_id)
    if not (post.author_id == current.id or current.role == "admin" or post.org_id in await _staff_orgs(db, current.id)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't delete this post")
    await db.delete(post)
    await db.commit()


@router.put("/{post_id}/like", status_code=204)
async def like(post_id: UUID, current: CurrentUser, db: DbSession):
    post = await _post(db, current, post_id)
    demo.same_world(current, post.is_synthetic)
    if not await db.scalar(select(PostLike.id).where(PostLike.post_id == post.id, PostLike.user_id == current.id)):
        db.add(PostLike(post_id=post.id, user_id=current.id))
        notify(db, post.author_id, "post_like", f"{await name_of(db, current.id)} liked your post: \"{post.body[:60]}\"",
               f"/in/{await handle_of(db, post.author_id)}", current.id)
        await db.commit()


@router.delete("/{post_id}/like", status_code=204)
async def unlike(post_id: UUID, current: CurrentUser, db: DbSession):
    post = await _post(db, current, post_id)
    row = await db.scalar(select(PostLike).where(PostLike.post_id == post.id, PostLike.user_id == current.id))
    if row:
        await db.delete(row)
        await db.commit()


@router.get("/{post_id}/comments", response_model=list[CommentOut])
async def comments(post_id: UUID, current: CurrentUser, db: DbSession):
    post = await _post(db, current, post_id)
    rows = list(await db.scalars(
        select(PostComment).where(PostComment.post_id == post.id, PostComment.author_id.not_in(_blocked(current.id)))
        .order_by(PostComment.created_at)
    ))
    authors = await network.minis(db, {c.author_id for c in rows})
    return [
        CommentOut(
            id=c.id, body=c.body, created_at=c.created_at, author=authors[c.author_id],
            can_delete=current.id in (c.author_id, post.author_id) or current.role == "admin",
        )
        for c in rows if c.author_id in authors
    ]


@router.post("/{post_id}/comments", response_model=CommentOut, status_code=201)
async def comment(post_id: UUID, payload: CommentIn, current: VerifiedUser, db: DbSession):
    if await over_limit("comment", str(current.id), 60):
        raise _slow()
    post = await _post(db, current, post_id)
    demo.same_world(current, post.is_synthetic)
    row = PostComment(post_id=post.id, author_id=current.id, body=payload.body.strip())
    db.add(row)
    notify(db, post.author_id, "post_comment", f"{await name_of(db, current.id)} commented on your post: \"{row.body[:60]}\"",
           f"/in/{await handle_of(db, post.author_id)}", current.id)
    await db.commit()
    await db.refresh(row)
    me = (await network.minis(db, [current.id]))[current.id]
    return CommentOut(id=row.id, body=row.body, created_at=row.created_at, author=me, can_delete=True)


@router.delete("/{post_id}/comments/{comment_id}", status_code=204)
async def remove_comment(post_id: UUID, comment_id: UUID, current: CurrentUser, db: DbSession):
    post = await _post(db, current, post_id)
    row = await db.get(PostComment, comment_id)
    if row is None or row.post_id != post.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    if current.id not in (row.author_id, post.author_id) and current.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can't delete this comment")
    await db.delete(row)
    await db.commit()
