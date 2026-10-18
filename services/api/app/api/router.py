from fastapi import APIRouter

from app.api.routes import (
    admin,
    affiliations,
    auth,
    connections,
    contact,
    members,
    newsletter,
    opportunities,
    profiles,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(profiles.router)
api_router.include_router(members.router)
api_router.include_router(connections.router)
api_router.include_router(opportunities.router)
api_router.include_router(contact.router)
api_router.include_router(newsletter.router)
api_router.include_router(affiliations.router)
api_router.include_router(admin.router)
