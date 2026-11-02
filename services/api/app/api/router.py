from fastapi import APIRouter

from app.api.routes import (
    admin,
    affiliations,
    auth,
    connections,
    contact,
    home,
    members,
    newsletter,
    opportunities,
    orgs,
    profiles,
    recommendations,
    sim,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(home.router)
api_router.include_router(profiles.router)
api_router.include_router(recommendations.router)
api_router.include_router(members.router)
api_router.include_router(connections.router)
api_router.include_router(opportunities.router)
api_router.include_router(orgs.router)
api_router.include_router(contact.router)
api_router.include_router(newsletter.router)
api_router.include_router(affiliations.router)
api_router.include_router(admin.router)

# Development only, and only with SIM_TOKEN set: the simulation engine's
# provisioning and inbox endpoints. Production never mounts them.
if settings.sim_enabled:
    api_router.include_router(sim.router)
