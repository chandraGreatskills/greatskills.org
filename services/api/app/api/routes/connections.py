from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, DbSession, VerifiedUser
from app.api.routes.members import card
from app.models.connection import Connection
from app.models.profile import Profile
from app.models.user import User
from app.schemas.social import ConnectionOut, ConnectionRequestIn, NetworkItemOut, NetworkSummaryOut
from app.services import demo
from app.services.affiliations import verified_roles
from app.services.network import state_of
from app.services.notify import handle_of, name_of, notify

router = APIRouter(prefix="/connections", tags=["connections"])


@router.post("", response_model=ConnectionOut, status_code=201)
async def send_request(payload: ConnectionRequestIn, current: VerifiedUser, db: DbSession):
    if payload.addressee_id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot connect to yourself")

    # already linked in either direction?
    existing = await db.scalar(
        select(Connection).where(
            or_(
                (Connection.requester_id == current.id)
                & (Connection.addressee_id == payload.addressee_id),
                (Connection.requester_id == payload.addressee_id)
                & (Connection.addressee_id == current.id),
            )
        )
    )
    target = await db.get(User, payload.addressee_id)
    # A block reads as "no such member" so it can't be detected by probing.
    if not target or not target.is_active or (existing and existing.status == "blocked"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if target.is_synthetic and not await demo.shows_demo(db, current):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    demo.same_world(current, target.is_synthetic)
    if existing and existing.status == "pending" and existing.addressee_id == current.id:
        # They already asked us: connecting back is the same as accepting.
        existing.status = "accepted"
        notify(db, existing.requester_id, "connection_accepted", f"{await name_of(db, current.id)} accepted your invitation",
               f"/in/{await handle_of(db, current.id)}", current.id)
        await db.commit()
        await db.refresh(existing)
        return existing
    if existing and existing.status == "declined" and existing.addressee_id == current.id:
        # We turned them down earlier and have changed our mind: reuse the row
        # as a fresh request from us.
        existing.requester_id, existing.addressee_id = current.id, payload.addressee_id
        existing.status = "pending"
        existing.message = payload.message
        notify(db, payload.addressee_id, "connection_request", f"{await name_of(db, current.id)} wants to connect",
               "/members?tab=invitations", current.id)
        await db.commit()
        await db.refresh(existing)
        return existing
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Connection already exists")

    conn = Connection(
        requester_id=current.id,
        addressee_id=payload.addressee_id,
        message=payload.message,
    )
    db.add(conn)
    notify(db, payload.addressee_id, "connection_request", f"{await name_of(db, current.id)} wants to connect",
           "/members?tab=invitations", current.id)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.get("", response_model=list[ConnectionOut])
async def list_connections(
    current: CurrentUser,
    db: DbSession,
    status_filter: Literal["accepted", "pending", "declined"] = Query("accepted", alias="status"),
):
    rows = await db.scalars(
        select(Connection).where(
            (Connection.status == status_filter)
            & or_(
                Connection.requester_id == current.id,
                Connection.addressee_id == current.id,
            )
        )
    )
    return list(rows)


@router.get("/pending", response_model=list[ConnectionOut])
async def incoming_requests(current: CurrentUser, db: DbSession):
    rows = await db.scalars(
        select(Connection).where(
            (Connection.addressee_id == current.id)
            & (Connection.status == "pending")
        )
    )
    return list(rows)


@router.post("/{conn_id}/respond", response_model=ConnectionOut)
async def respond(
    conn_id: UUID,
    current: CurrentUser,
    db: DbSession,
    accept: bool = Query(...),
):
    conn = await db.get(Connection, conn_id)
    if not conn or conn.addressee_id != current.id or conn.status != "pending":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    conn.status = "accepted" if accept else "declined"
    if accept:
        notify(db, conn.requester_id, "connection_accepted", f"{await name_of(db, current.id)} accepted your invitation",
               f"/in/{await handle_of(db, current.id)}", current.id)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.get("/summary", response_model=NetworkSummaryOut)
async def summary(current: CurrentUser, db: DbSession):
    """Counts for the Network tabs and the home page."""
    rows = await db.scalars(
        select(Connection).where(
            or_(Connection.requester_id == current.id, Connection.addressee_id == current.id)
        )
    )
    counts = {"connected": 0, "received": 0, "sent": 0}
    for c in rows:
        s = state_of(c, current.id)
        if s in counts:
            counts[s] += 1
    return NetworkSummaryOut(
        connections=counts["connected"], received=counts["received"], sent=counts["sent"]
    )


@router.get("/network", response_model=list[NetworkItemOut])
async def my_network(
    current: CurrentUser,
    db: DbSession,
    view: Literal["connections", "received", "sent"] = "connections",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0, le=5000),
):
    """The member's own network with each person's card: accepted
    connections, invitations waiting on them, or requests they sent."""
    me = current.id
    if view == "connections":
        where = (Connection.status == "accepted") & or_(
            Connection.requester_id == me, Connection.addressee_id == me
        )
    elif view == "received":
        where = (Connection.status == "pending") & (Connection.addressee_id == me)
    else:
        # A declined request still reads as sent to its sender (see network.py).
        where = Connection.status.in_(("pending", "declined")) & (Connection.requester_id == me)

    conns = list(
        await db.scalars(
            select(Connection).where(where).order_by(Connection.created_at.desc(), Connection.id)
            .limit(limit).offset(offset)
        )
    )
    others = [c.addressee_id if c.requester_id == me else c.requester_id for c in conns]
    rows = {
        p.user_id: (p, synthetic)
        for p, synthetic in await db.execute(
            select(Profile, User.is_synthetic)
            .join(User, User.id == Profile.user_id)
            .where(Profile.user_id.in_(others), User.is_active.is_(True))
        )
    }
    roles = await verified_roles(db, list(rows))
    out = []
    for c, other in zip(conns, others):
        if other not in rows:
            continue
        p, synthetic = rows[other]
        out.append(
            NetworkItemOut(
                id=c.id,
                message=c.message,
                created_at=c.created_at,
                member=card(p, synthetic, roles.get(other, []), (state_of(c, me), c.id)),
            )
        )
    return out


@router.delete("/{conn_id}", status_code=204)
async def withdraw_or_remove(conn_id: UUID, current: CurrentUser, db: DbSession):
    """Withdraw a request you sent, or remove an existing connection. Either
    side may remove a connection; only the sender may withdraw a request."""
    conn = await db.get(Connection, conn_id)
    if not conn or current.id not in (conn.requester_id, conn.addressee_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection not found")
    mine = conn.requester_id == current.id
    if conn.status == "accepted" or (mine and conn.status in ("pending", "declined")):
        await db.delete(conn)
        await db.commit()
        return
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Connection not found")


@router.post("/block/{user_id}", status_code=204)
async def block(user_id: UUID, current: CurrentUser, db: DbSession):
    """Block a member: no messages, no requests, and each disappears from the
    other's searches and feed. Replaces any connection between the two."""
    if user_id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't block yourself")
    if await db.get(User, user_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    rows = list(await db.scalars(select(Connection).where(or_(
        (Connection.requester_id == current.id) & (Connection.addressee_id == user_id),
        (Connection.requester_id == user_id) & (Connection.addressee_id == current.id),
    ))))
    if any(r.status == "blocked" and r.requester_id == user_id for r in rows):
        return  # they already blocked you; nothing more to do, and don't reveal it
    for r in rows:
        await db.delete(r)
    await db.flush()
    db.add(Connection(requester_id=current.id, addressee_id=user_id, status="blocked"))
    await db.commit()


@router.delete("/block/{user_id}", status_code=204)
async def unblock(user_id: UUID, current: CurrentUser, db: DbSession):
    row = await db.scalar(select(Connection).where(
        Connection.requester_id == current.id, Connection.addressee_id == user_id, Connection.status == "blocked"
    ))
    if row:
        await db.delete(row)
        await db.commit()
