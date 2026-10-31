"""Where a member stands with other members, for showing the right button.

A declined request stays "sent" to the person who sent it, the way other
networks keep an ignored invite pending, so declining can't be detected. The
person who declined sees "none" and may send their own request later."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connection import Connection

State = Literal["none", "sent", "received", "connected"]


def state_of(conn: Connection, viewer_id: UUID) -> State:
    mine = conn.requester_id == viewer_id
    if conn.status == "accepted":
        return "connected"
    if conn.status == "pending":
        return "sent" if mine else "received"
    if conn.status == "declined" and mine:
        return "sent"
    return "none"


async def states(
    db: AsyncSession, viewer_id: UUID, others: list[UUID]
) -> dict[UUID, tuple[State, UUID | None]]:
    """State and connection id for each member in `others`. Members with no
    link are left out; callers treat a missing key as ("none", None)."""
    if not others:
        return {}
    rows = await db.scalars(
        select(Connection).where(
            or_(
                (Connection.requester_id == viewer_id) & Connection.addressee_id.in_(others),
                (Connection.addressee_id == viewer_id) & Connection.requester_id.in_(others),
            )
        )
    )
    out: dict[UUID, tuple[State, UUID | None]] = {}
    for c in rows:
        other = c.addressee_id if c.requester_id == viewer_id else c.requester_id
        s = state_of(c, viewer_id)
        if s != "none":
            out[other] = (s, c.id)
    return out


def linked_with(viewer_id: UUID):
    """User ids the viewer is connected to or has a pending request with,
    in either direction, as a subquery. Discover leaves these out: they
    already live under My connections, Invitations or Sent."""
    live = Connection.status.in_(("accepted", "pending"))
    return select(Connection.addressee_id).where(
        (Connection.requester_id == viewer_id) & live
    ).union(
        select(Connection.requester_id).where((Connection.addressee_id == viewer_id) & live)
    )


async def mutual_counts(db: AsyncSession, viewer_id: UUID, others: list[UUID]) -> dict[UUID, int]:
    """How many connections the viewer shares with each member in `others`.
    Members with none are left out."""
    if not others:
        return {}
    mine = set(await db.scalars(accepted_with(viewer_id)))
    if not mine:
        return {}
    rows = await db.execute(
        select(Connection.requester_id, Connection.addressee_id).where(
            Connection.status == "accepted",
            or_(
                Connection.requester_id.in_(others) & Connection.addressee_id.in_(mine),
                Connection.addressee_id.in_(others) & Connection.requester_id.in_(mine),
            ),
        )
    )
    wanted = set(others)
    out: dict[UUID, int] = {}
    for a, b in rows:
        member = a if a in wanted and b in mine else b
        out[member] = out.get(member, 0) + 1
    return out


def accepted_with(viewer_id: UUID):
    """User ids the viewer is connected to, as a subquery."""
    return select(Connection.addressee_id).where(
        (Connection.requester_id == viewer_id) & (Connection.status == "accepted")
    ).union(
        select(Connection.requester_id).where(
            (Connection.addressee_id == viewer_id) & (Connection.status == "accepted")
        )
    )
