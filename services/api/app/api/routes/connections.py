from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select

from app.api.deps import CurrentUser, DbSession
from app.models.connection import Connection
from app.schemas.social import ConnectionOut, ConnectionRequestIn

router = APIRouter(prefix="/connections", tags=["connections"])


@router.post("", response_model=ConnectionOut, status_code=201)
async def send_request(payload: ConnectionRequestIn, current: CurrentUser, db: DbSession):
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
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Connection already exists")

    conn = Connection(
        requester_id=current.id,
        addressee_id=payload.addressee_id,
        message=payload.message,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.get("", response_model=list[ConnectionOut])
async def list_connections(
    current: CurrentUser,
    db: DbSession,
    status_filter: str = Query("accepted", alias="status"),
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
    if not conn or conn.addressee_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    conn.status = "accepted" if accept else "declined"
    await db.commit()
    await db.refresh(conn)
    return conn
