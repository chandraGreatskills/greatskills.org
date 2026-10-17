"""Email sending. In development we print to the console so nothing external
is required to test the flow. Swap in an SMTP/provider backend for production."""

import logging

from app.core.config import settings

logger = logging.getLogger("greatskills.email")


async def send_email(to: str, subject: str, body: str) -> None:
    if settings.is_dev:
        logger.info("EMAIL -> %s | %s\n%s", to, subject, body)
        print(f"\n[DEV EMAIL] to={to}\nsubject={subject}\n{body}\n")
        return
    # production: integrate SMTP / SendGrid / Postmark here
    raise NotImplementedError("Configure a production email backend")


async def send_verification_email(to: str, token: str) -> None:
    link = f"https://achievers.greatskills.org/verify?token={token}"
    await send_email(
        to,
        "Verify your Great Skills account",
        f"Welcome to Great Skills! Confirm your email: {link}",
    )
