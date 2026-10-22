from pydantic import BaseModel

from app.services.demo import DemoMode


class DemoSettingIn(BaseModel):
    mode: DemoMode


class DemoSettingOut(BaseModel):
    mode: DemoMode
    # How much demo data the database holds, so the admin knows what the
    # switch will show.
    members: int
    organizations: int
    opportunities: int
