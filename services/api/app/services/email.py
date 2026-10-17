"""Email sending. Development prints to the console so nothing external is
needed to test the flow. Production sends over SMTP (SSL) when SMTP_HOST is
set, and otherwise logs and skips."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from html import escape

from app.core.config import settings

logger = logging.getLogger("greatskills.email")

NAVY = "#012652"
GREEN = "#359706"
INK = "#606162"


def _send_smtp(msg: EmailMessage) -> None:
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(msg)


async def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    if settings.is_dev:
        logger.info("EMAIL -> %s | %s\n%s", to, subject, text)
        print(f"\n[DEV EMAIL] to={to}\nsubject={subject}\n{text}\n")
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
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    # smtplib blocks; keep it off the event loop.
    await asyncio.to_thread(_send_smtp, msg)


def _layout(heading: str, body_html: str) -> str:
    """Table-based, inline-styled shell: the only layout that renders the same
    in Gmail, Outlook and Apple Mail. No images, so nothing is blocked."""
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:{NAVY};padding:22px 32px;color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.3px;">
Great Skills <span style="color:#88c24b;font-weight:normal;">Achievers</span></td></tr>
<tr><td style="padding:32px;color:{NAVY};">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">{heading}</h1>
{body_html}
</td></tr>
<tr><td style="padding:18px 32px;border-top:1px solid #eef0f3;color:{INK};font-size:12px;line-height:1.5;">
Great Skills &middot; <a href="https://greatskills.org" style="color:{INK};">greatskills.org</a><br>
The Future Belongs to You.</td></tr>
</table></td></tr></table></body></html>"""


def _first_name(full_name: str | None) -> str | None:
    if not full_name:
        return None
    first = full_name.strip().split()[0] if full_name.strip() else ""
    return first or None


async def send_verification_email(to: str, token: str, full_name: str | None = None) -> None:
    link = f"{settings.portal_url}/verify?token={token}"
    hours = settings.verify_token_ttl_hours
    first = _first_name(full_name)
    greeting = f"Hi {first}," if first else "Hi there,"

    text = (
        f"{greeting}\n\n"
        "Thanks for joining Great Skills Achievers. One quick step before you dive "
        "in: confirm this is your email address.\n\n"
        f"Confirm my email:\n{link}\n\n"
        f"The link works for {hours} hours. If you didn't sign up, ignore this email "
        "and nothing will happen.\n\n"
        "Great Skills\nhttps://greatskills.org\n"
    )

    html = _layout(
        "Confirm your email",
        f"""<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:{NAVY};">{escape(greeting)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:{INK};">Thanks for joining Great Skills Achievers.
One quick step before you dive in: confirm this is your email address.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
<td style="border-radius:12px;background:{GREEN};">
<a href="{escape(link)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">Confirm my email</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:{INK};">The link works for {hours} hours.
If you didn't sign up, ignore this email and nothing will happen.</p>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:{INK};">Button not working? Copy this link into your browser:<br>
<a href="{escape(link)}" style="color:{GREEN};word-break:break-all;">{escape(link)}</a></p>""",
    )

    await send_email(to, "Confirm your email for Great Skills Achievers", text, html)
