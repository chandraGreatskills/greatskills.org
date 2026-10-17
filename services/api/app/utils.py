from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile


async def unique_handle(db: AsyncSession, full_name: str) -> str:
    """Turn a name into a unique URL handle, e.g. 'Jane Doe' -> 'jane-doe',
    then 'jane-doe-2' if taken."""
    base = slugify(full_name) or "member"
    handle = base
    n = 1
    while True:
        exists = await db.scalar(select(Profile.id).where(Profile.handle == handle))
        if not exists:
            return handle
        n += 1
        handle = f"{base}-{n}"
