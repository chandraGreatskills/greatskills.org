"""Email sending. Development prints to the console so nothing external is
needed to test the flow. Production sends over SMTP (SSL) when SMTP_HOST is
set, and otherwise logs and skips."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("greatskills.email")


def _send_smtp(msg: EmailMessage) -> None:
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


async def send_email(to: str, subject: str, body: str) -> None:
    if settings.is_dev:
        logger.info("EMAIL -> %s | %s\n%s", to, subject, body)
        print(f"\n[DEV EMAIL] to={to}\nsubject={subject}\n{body}\n")
        return
    if not settings.smtp_host:
        # Log and skip rather than raise: callers such as registration have
        # already committed their work, and a raise here turned a successful
        # sign-up into a 500.
        logger.warning("Email backend not configured; not sent: %s", subject)
        return

    msg = EmailMessage()
    msg["From"] = settings.mail_from or settings.smtp_user
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    # smtplib blocks; keep it off the event loop.
    await asyncio.to_thread(_send_smtp, msg)


async def send_verification_email(to: str, token: str) -> None:
    link = f"{settings.portal_url}/verify?token={token}"
    hours = settings.verify_token_ttl_hours
    await send_email(
        to,
        "Verify your Great Skills email",
        "Welcome to Great Skills!\n\n"
        f"Confirm your email address by opening this link:\n{link}\n\n"
        f"The link works for {hours} hours. If you didn't create an account, "
        "you can ignore this email.\n",
    )
