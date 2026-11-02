"""Private messages between members.

Who can write to whom:
- connections, freely;
- an employer to someone who applied to their opening;
- a verified recruiter or faculty member, or a mentor, to anyone else as a
  message request: one message, then nothing more until the recipient
  accepts (replying also accepts);
- nobody, across a block in either direction.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.api.abuse import over_limit
from app.api.deps import CurrentUser, DbSession, VerifiedUser
from app.models.connection import Connection
from app.models.message import Conversation, ConversationMember, Message
from app.models.opportunity import Application, Opportunity
from app.models.organization import Affiliation
from app.models.profile import Profile
from app.models.user import User
from app.schemas.message import Box, ConversationOut, FileIn, MessageOut, SendIn, StartIn, ThreadOut
from app.services import affiliations as aff
from app.services import demo, network

router = APIRouter(prefix="/messages", tags=["messages"])

UNSEND_WINDOW = timedelta(minutes=15)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    # SQLite hands back naive datetimes; Postgres keeps the zone.
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _pair(a: UUID, b: UUID) -> str:
    return ":".join(sorted((a.hex, b.hex)))


async def _blocked(db, a: UUID, b: UUID) -> bool:
    return (await db.scalar(
        select(Connection.id).where(
            Connection.status == "blocked",
            or_(
                (Connection.requester_id == a) & (Connection.addressee_id == b),
                (Connection.requester_id == b) & (Connection.addressee_id == a),
            ),
        ).limit(1)
    )) is not None


async def _may_request(db, user: User) -> bool:
    """Verified recruiters and faculty, and mentors, may write to people
    they aren't connected to (as a request)."""
    if await aff.has_verified(db, user.id, ("recruiter", "faculty")):
        return True
    p = await db.scalar(select(Profile).where(Profile.user_id == user.id))
    return bool(p and (p.open_to_mentor or p.member_type == "mentor"))


async def _employer_of_applicant(db, user: User, applicant: UUID, opp_id: UUID | None) -> Opportunity | None:
    if opp_id is None:
        return None
    opp = await db.get(Opportunity, opp_id)
    if opp is None:
        return None
    mine = opp.posted_by == user.id
    if not mine and opp.org_id:
        mine = (await db.scalar(select(Affiliation.id).where(
            Affiliation.user_id == user.id, Affiliation.org_id == opp.org_id,
            Affiliation.kind == "recruiter", Affiliation.status == "verified",
        ).limit(1))) is not None
    applied = (await db.scalar(select(Application.id).where(
        Application.opportunity_id == opp.id, Application.applicant_id == applicant
    ).limit(1))) is not None
    return opp if mine and applied else None


async def _members(db, conv_id: UUID) -> list[ConversationMember]:
    return list(await db.scalars(select(ConversationMember).where(ConversationMember.conversation_id == conv_id)))


async def _thread(db, current: User, conv_id: UUID) -> tuple[Conversation, ConversationMember, ConversationMember]:
    conv = await db.get(Conversation, conv_id)
    members = await _members(db, conv_id) if conv else []
    me = next((m for m in members if m.user_id == current.id), None)
    other = next((m for m in members if m.user_id != current.id), None)
    if conv is None or me is None or other is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    # A declined request disappears for the person who declined it.
    if conv.status == "declined" and conv.started_by != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found")
    return conv, me, other


def _send_rule(conv: Conversation, current: User, blocked: bool, sent_by_me: int) -> str | None:
    """Why the viewer can't send right now, or None if they can."""
    if blocked:
        return "You can't message this member."
    if conv.status == "declined":
        return "This member isn't accepting messages from you."
    if conv.status == "request" and conv.started_by == current.id and sent_by_me >= 1:
        return "Waiting for them to accept your message request."
    return None


async def _summaries(db, current: User, convs: list[Conversation]) -> list[ConversationOut]:
    if not convs:
        return []
    ids = [c.id for c in convs]
    members = list(await db.scalars(select(ConversationMember).where(ConversationMember.conversation_id.in_(ids))))
    mine = {m.conversation_id: m for m in members if m.user_id == current.id}
    others = {m.conversation_id: m for m in members if m.user_id != current.id}
    people = await network.minis(db, {m.user_id for m in others.values()})
    out = []
    for c in convs:
        me, other = mine.get(c.id), others.get(c.id)
        if not me or not other or other.user_id not in people:
            continue
        last = await db.scalar(
            select(Message).where(Message.conversation_id == c.id).order_by(Message.created_at.desc()).limit(1)
        )
        unread = await db.scalar(
            select(func.count()).select_from(Message).where(
                Message.conversation_id == c.id, Message.sender_id != current.id,
                *( [Message.created_at > me.last_read_at] if me.last_read_at else [] ),
            )
        )
        opp = await db.get(Opportunity, c.opportunity_id) if c.opportunity_id else None
        out.append(ConversationOut(
            id=c.id, other=people[other.user_id], status=c.status,
            incoming_request=c.status == "request" and c.started_by != current.id,
            last_message=("Message unsent" if last.unsent_at else last.body[:140]) if last else None,
            last_message_mine=bool(last and last.sender_id == current.id),
            last_message_at=c.last_message_at, unread=unread or 0,
            starred=me.starred, archived=me.archived,
            opportunity_title=opp.title if opp else None, is_demo=c.is_synthetic,
        ))
    return out


@router.get("/conversations", response_model=list[ConversationOut])
async def inbox(
    current: CurrentUser,
    db: DbSession,
    box: Box = "all",
    q: str | None = Query(None, max_length=100),
    limit: int = Query(50, ge=1, le=100),
):
    """The member's conversations, newest first. Requests waiting for the
    member's answer only show under "requests"."""
    stmt = (
        select(Conversation)
        .join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
        .where(ConversationMember.user_id == current.id)
        .where(~((Conversation.status == "declined") & (Conversation.started_by != current.id)))
    )
    incoming = (Conversation.status == "request") & (Conversation.started_by != current.id)
    if box == "requests":
        stmt = stmt.where(incoming)
    else:
        stmt = stmt.where(~incoming)
        if box == "archived":
            stmt = stmt.where(ConversationMember.archived.is_(True))
        else:
            stmt = stmt.where(ConversationMember.archived.is_(False))
        if box == "starred":
            stmt = stmt.where(ConversationMember.starred.is_(True))
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_") + "%"
        other = select(ConversationMember.conversation_id).join(
            Profile, Profile.user_id == ConversationMember.user_id
        ).where(ConversationMember.user_id != current.id, Profile.full_name.ilike(like, escape="\\"))
        text = select(Message.conversation_id).where(Message.body.ilike(like, escape="\\"), Message.unsent_at.is_(None))
        stmt = stmt.where(or_(Conversation.id.in_(other), Conversation.id.in_(text)))
    convs = list(await db.scalars(stmt.order_by(Conversation.last_message_at.desc().nulls_last()).limit(limit)))
    out = await _summaries(db, current, convs)
    if box == "unread":
        out = [c for c in out if c.unread]
    return out


@router.get("/unread-count")
async def unread_count(current: CurrentUser, db: DbSession):
    """Conversations with unread messages, plus requests waiting for an
    answer: the number on the Messages tab."""
    convs = list(await db.scalars(
        select(Conversation).join(ConversationMember, ConversationMember.conversation_id == Conversation.id)
        .where(ConversationMember.user_id == current.id, Conversation.status != "declined")
    ))
    summaries = await _summaries(db, current, convs)
    return {"unread": sum(1 for c in summaries if c.unread and not c.archived), "requests": sum(1 for c in summaries if c.incoming_request)}


@router.post("/conversations", response_model=ThreadOut, status_code=201)
async def start(payload: StartIn, current: VerifiedUser, db: DbSession):
    """Write to someone. Reuses the existing conversation with them."""
    other = await db.get(User, payload.to_user_id)
    if other is None or not other.is_active or other.id == current.id or await _blocked(db, current.id, other.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    demo.same_world(current, other.is_synthetic)
    if await over_limit("message", str(current.id), 120):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You're sending a lot of messages. Wait a while and try again.")

    conv = await db.scalar(select(Conversation).where(Conversation.pair_key == _pair(current.id, other.id)))
    if conv is None:
        connected = (await network.states(db, current.id, [other.id])).get(other.id, ("none", None))[0] == "connected"
        opp = await _employer_of_applicant(db, current, other.id, payload.opportunity_id)
        if connected or opp:
            kind = "active"
        elif await _may_request(db, current):
            if await over_limit("message-request", str(current.id), 20):
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You've sent many message requests today. Try again later.")
            kind = "request"
        else:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Connect with this member first to send a message.")
        conv = Conversation(
            pair_key=_pair(current.id, other.id), status=kind, started_by=current.id,
            opportunity_id=opp.id if opp else None, is_synthetic=current.is_synthetic,
        )
        db.add(conv)
        await db.flush()
        db.add_all([ConversationMember(conversation_id=conv.id, user_id=current.id), ConversationMember(conversation_id=conv.id, user_id=other.id)])
        await db.flush()
    return await _send(db, current, conv.id, payload.body)


async def _send(db, current: User, conv_id: UUID, body: str) -> ThreadOut:
    conv, me, other = await _thread(db, current, conv_id)
    sent = await db.scalar(select(func.count()).select_from(Message).where(
        Message.conversation_id == conv.id, Message.sender_id == current.id
    ))
    reason = _send_rule(conv, current, await _blocked(db, current.id, other.user_id), sent or 0)
    if reason:
        raise HTTPException(status.HTTP_403_FORBIDDEN, reason)
    if conv.status == "request" and conv.started_by != current.id:
        conv.status = "active"  # replying accepts the request
    now = _now()
    db.add(Message(conversation_id=conv.id, sender_id=current.id, body=body.strip()))
    conv.last_message_at = now
    me.last_read_at = now
    me.archived = False
    other.archived = False  # a new message brings it back to the inbox
    await db.commit()
    return await thread(conv.id, current, db)


@router.get("/conversations/{conv_id}", response_model=ThreadOut)
async def thread(conv_id: UUID, current: CurrentUser, db: DbSession):
    """One conversation with its latest messages. Opening it marks it read."""
    conv, me, other = await _thread(db, current, conv_id)
    rows = list(await db.scalars(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).limit(200)
    ))[::-1]
    me.last_read_at = _now()
    await db.commit()
    seen_until = _aware(other.last_read_at)
    now = _now()
    msgs = [
        MessageOut(
            id=m.id, sender_id=m.sender_id, body="" if m.unsent_at else m.body, created_at=m.created_at,
            unsent=m.unsent_at is not None, mine=m.sender_id == current.id,
            seen=bool(m.sender_id == current.id and seen_until and seen_until >= _aware(m.created_at)),
            can_unsend=m.sender_id == current.id and not m.unsent_at and now - _aware(m.created_at) <= UNSEND_WINDOW,
        )
        for m in rows
    ]
    summary = (await _summaries(db, current, [conv]))[0]
    sent = sum(1 for m in rows if m.sender_id == current.id)
    reason = _send_rule(conv, current, await _blocked(db, current.id, other.user_id), sent)
    return ThreadOut(**summary.model_dump(), messages=msgs, can_send=reason is None, reason=reason)


@router.post("/conversations/{conv_id}/messages", response_model=ThreadOut, status_code=201)
async def send(conv_id: UUID, payload: SendIn, current: VerifiedUser, db: DbSession):
    if await over_limit("message", str(current.id), 120):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You're sending a lot of messages. Wait a while and try again.")
    return await _send(db, current, conv_id, payload.body)


@router.post("/conversations/{conv_id}/accept", response_model=ThreadOut)
async def accept(conv_id: UUID, current: CurrentUser, db: DbSession):
    conv, _, _ = await _thread(db, current, conv_id)
    if conv.status != "request" or conv.started_by == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to accept")
    conv.status = "active"
    await db.commit()
    return await thread(conv.id, current, db)


@router.post("/conversations/{conv_id}/decline", status_code=204)
async def decline(conv_id: UUID, current: CurrentUser, db: DbSession):
    conv, _, _ = await _thread(db, current, conv_id)
    if conv.status != "request" or conv.started_by == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to decline")
    conv.status = "declined"
    await db.commit()


@router.patch("/conversations/{conv_id}", response_model=ConversationOut)
async def file(conv_id: UUID, payload: FileIn, current: CurrentUser, db: DbSession):
    """Star or archive, for the viewer only."""
    conv, me, _ = await _thread(db, current, conv_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(me, field, value)
    await db.commit()
    return (await _summaries(db, current, [conv]))[0]


@router.delete("/{message_id}", status_code=204)
async def unsend(message_id: UUID, current: CurrentUser, db: DbSession):
    """Take back a message within 15 minutes of sending it."""
    msg = await db.get(Message, message_id)
    if msg is None or msg.sender_id != current.id or msg.unsent_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    if _now() - _aware(msg.created_at) > UNSEND_WINDOW:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Messages can be unsent for 15 minutes after sending")
    msg.unsent_at = _now()
    msg.body = ""
    await db.commit()
