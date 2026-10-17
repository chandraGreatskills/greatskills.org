from fastapi import APIRouter

from app.api.routes import (
    auth,
    connections,
    members,
    opportunities,
    profiles,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(profiles.router)
api_router.include_router(members.router)
api_router.include_router(connections.router)
api_router.include_router(opportunities.router)
