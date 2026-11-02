"""Throwaway inboxes (Mailinator, 10MinuteMail and the like).

Anyone can read mail at these for a few minutes without signing up, so a
confirmation link sent there proves nothing about a real person. The list is
bundled with the app (app/data/disposable_domains.txt), so a sign-up check
never calls an outside service.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_LIST = Path(__file__).resolve().parent.parent / "data" / "disposable_domains.txt"

MESSAGE = (
    "Please use an email address you'll keep, like Gmail, Outlook or your school email. "
    "Temporary inboxes can't receive our messages later."
)


@lru_cache(maxsize=1)
def _domains() -> frozenset[str]:
    lines = _LIST.read_text(encoding="utf-8").splitlines()
    return frozenset(l.strip().lower() for l in lines if l.strip() and not l.startswith("#"))


def is_disposable(domain: str) -> bool:
    """Checks the domain and every parent of it, so inbox.mailinator.com is
    caught by mailinator.com. Stops before the last label."""
    parts = domain.strip().lower().rstrip(".").split(".")
    blocked = _domains()
    return any(".".join(parts[i:]) in blocked for i in range(len(parts) - 1))
