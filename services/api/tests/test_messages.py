"""Messaging and notifications: who can write to whom, requests, read ticks,
unsend, filing, blocking, and the bell."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.db.base import SessionLocal
from app.models.message import Message
from tests.test_affiliations import _approved_org, _claim, _confirm, outbox  # noqa: F401
from tests.test_network import _pair, _send
from tests.test_privacy import PREFIX, _join

M = f"{PREFIX}/messages"


async def _connect(a, b, me_b):
    c = await _send(a, me_b)
    await b.post(f"{PREFIX}/connections/{c['id']}/respond?accept=true")


async def test_connections_message_and_see_read_ticks(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    r = await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "Hi Bilal"})
    assert r.status_code == 403  # not connected yet
    await _connect(a, b, me_b)
    t = (await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "Hi Bilal"})).json()
    assert t["status"] == "active" and t["messages"][0]["mine"] and not t["messages"][0]["seen"]

    assert (await b.get(f"{M}/unread-count")).json()["unread"] == 1
    inbox = (await b.get(f"{M}/conversations")).json()
    assert inbox[0]["unread"] == 1 and inbox[0]["last_message"] == "Hi Bilal"
    await b.get(f"{M}/conversations/{t['id']}")  # opening marks it read
    assert (await b.get(f"{M}/unread-count")).json()["unread"] == 0
    assert (await a.get(f"{M}/conversations/{t['id']}")).json()["messages"][0]["seen"] is True

    # Writing again reuses the same conversation.
    again = (await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "Still there?"})).json()
    assert again["id"] == t["id"] and len(again["messages"]) == 2


async def test_strangers_need_a_role_and_requests_wait(client, browser, outbox):  # noqa: F811
    await _approved_org("Brightline", "brightline.example", "industry")
    rec, me_r = await _join(browser, "r@example.com", "Rae Recruiter")
    seeker, me_s = await _join(browser, "s@example.com", "Sam Seeker")
    assert (await seeker.post(f"{M}/conversations", json={"to_user_id": me_r["id"], "body": "Hire me"})).status_code == 403

    _, tok = await _claim(rec, outbox, "recruiter", "rae@brightline.example")
    await _confirm(client, tok)
    t = (await rec.post(f"{M}/conversations", json={"to_user_id": me_s["id"], "body": "Interested in a role?"})).json()
    assert t["status"] == "request" and t["can_send"] is False
    assert (await rec.post(f"{M}/conversations/{t['id']}/messages", json={"body": "Hello?"})).status_code == 403

    assert (await seeker.get(f"{M}/conversations")).json() == []  # requests stay out of the main inbox
    req = (await seeker.get(f"{M}/conversations?box=requests")).json()
    assert req[0]["incoming_request"] is True
    assert (await seeker.get(f"{M}/unread-count")).json()["requests"] == 1
    r = await seeker.post(f"{M}/conversations/{t['id']}/messages", json={"body": "Yes, tell me more"})
    assert r.json()["status"] == "active"  # replying accepts
    assert (await rec.post(f"{M}/conversations/{t['id']}/messages", json={"body": "Great"})).status_code == 201


async def test_declined_request_disappears_for_the_decliner(client, browser):
    m, me_m = await _join(browser, "m@example.com", "Mo Mentor")
    await m.patch(f"{PREFIX}/profiles/me", json={"open_to_mentor": True})
    s, me_s = await _join(browser, "s@example.com", "Sam")
    t = (await m.post(f"{M}/conversations", json={"to_user_id": me_s["id"], "body": "Happy to help with your resume"})).json()
    assert (await s.post(f"{M}/conversations/{t['id']}/decline")).status_code == 204
    assert (await s.get(f"{M}/conversations/{t['id']}")).status_code == 404
    assert (await s.get(f"{M}/conversations?box=requests")).json() == []
    assert (await m.get(f"{M}/conversations/{t['id']}")).json()["can_send"] is False


async def test_employer_can_message_own_applicant(client, browser):
    emp, _ = await _join(browser, "e@example.com", "Em Ployer")
    job = (await emp.post(f"{PREFIX}/opportunities", json={"title": "Analyst", "kind": "employment"})).json()
    app_, me_app = await _join(browser, "a@example.com", "Al Applicant")
    other, me_other = await _join(browser, "o@example.com", "Oz Other")
    await app_.post(f"{PREFIX}/opportunities/{job['id']}/apply", json={})
    ok = await emp.post(f"{M}/conversations", json={"to_user_id": me_app["id"], "body": "Thanks for applying", "opportunity_id": job["id"]})
    assert ok.status_code == 201 and ok.json()["status"] == "active" and ok.json()["opportunity_title"] == "Analyst"
    no = await emp.post(f"{M}/conversations", json={"to_user_id": me_other["id"], "body": "Hi", "opportunity_id": job["id"]})
    assert no.status_code == 403  # didn't apply


async def test_unsend_window_star_archive(client, browser):
    a, _, b, me_b = await _pair(browser)
    await _connect(a, b, me_b)
    t = (await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "oops"})).json()
    mid = t["messages"][0]["id"]
    assert (await b.delete(f"{M}/{mid}")).status_code == 404  # not yours
    assert (await a.delete(f"{M}/{mid}")).status_code == 204
    msg = (await b.get(f"{M}/conversations/{t['id']}")).json()["messages"][0]
    assert msg["unsent"] is True and msg["body"] == ""

    t2 = (await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "later"})).json()
    old = t2["messages"][-1]["id"]
    async with SessionLocal() as db:
        await db.execute(update(Message).where(Message.body == "later").values(created_at=datetime.now(timezone.utc) - timedelta(minutes=20)))
        await db.commit()
    assert (await a.delete(f"{M}/{old}")).status_code == 400

    await b.patch(f"{M}/conversations/{t['id']}", json={"starred": True, "archived": True})
    assert (await b.get(f"{M}/conversations")).json() == []
    assert len((await b.get(f"{M}/conversations?box=archived")).json()) == 1
    assert len((await b.get(f"{M}/conversations?box=starred")).json()) == 0  # starred view skips archived
    await a.post(f"{M}/conversations/{t['id']}/messages", json={"body": "new"})
    assert len((await b.get(f"{M}/conversations?box=starred")).json()) == 1  # a new message unarchives


async def test_block_stops_messages_and_requests(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    await _connect(a, b, me_b)
    t = (await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "hi"})).json()
    assert (await b.post(f"{PREFIX}/connections/block/{me_a['id']}")).status_code == 204
    assert (await a.post(f"{M}/conversations/{t['id']}/messages", json={"body": "hello?"})).status_code == 403
    assert (await a.post(f"{PREFIX}/connections", json={"addressee_id": me_b["id"]})).status_code == 404
    assert (await b.delete(f"{PREFIX}/connections/block/{me_a['id']}")).status_code == 204


async def test_search_by_name_and_text(client, browser):
    a, _, b, me_b = await _pair(browser)
    await _connect(a, b, me_b)
    await a.post(f"{M}/conversations", json={"to_user_id": me_b["id"], "body": "About the hackathon"})
    assert len((await a.get(f"{M}/conversations?q=hackathon")).json()) == 1
    assert len((await a.get(f"{M}/conversations?q=Bilal")).json()) == 1
    assert (await a.get(f"{M}/conversations?q=nothing")).json() == []


async def test_notifications_bell(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    c = await _send(a, me_b)
    bell = (await b.get(f"{PREFIX}/notifications")).json()
    assert bell[0]["kind"] == "connection_request" and bell[0]["actor"]["full_name"] == "Asha Rao"
    await b.post(f"{PREFIX}/connections/{c['id']}/respond?accept=true")
    assert (await a.get(f"{PREFIX}/notifications")).json()[0]["kind"] == "connection_accepted"

    pid = (await a.post(f"{PREFIX}/posts", json={"body": "Hello"})).json()["id"]
    await b.put(f"{PREFIX}/posts/{pid}/like")
    await b.post(f"{PREFIX}/posts/{pid}/comments", json={"body": "Nice"})
    await a.put(f"{PREFIX}/posts/{pid}/like")  # liking your own post notifies nobody
    kinds = [n["kind"] for n in (await a.get(f"{PREFIX}/notifications")).json()]
    assert kinds.count("post_like") == 1 and "post_comment" in kinds
    assert (await a.get(f"{PREFIX}/notifications/unread-count")).json()["unread"] == 3
    await a.post(f"{PREFIX}/notifications/read-all")
    assert (await a.get(f"{PREFIX}/notifications/unread-count")).json()["unread"] == 0
    nid = (await a.get(f"{PREFIX}/notifications")).json()[0]["id"]
    assert (await b.post(f"{PREFIX}/notifications/{nid}/read")).status_code == 404  # not yours


async def test_applicant_status_notifies(client, browser):
    emp, _ = await _join(browser, "e@example.com", "Em Ployer")
    job = (await emp.post(f"{PREFIX}/opportunities", json={"title": "Analyst", "kind": "employment"})).json()
    app_, _ = await _join(browser, "a@example.com", "Al Applicant")
    application = (await app_.post(f"{PREFIX}/opportunities/{job['id']}/apply", json={})).json()
    assert (await emp.get(f"{PREFIX}/notifications")).json()[0]["text"] == "Al Applicant applied to Analyst"
    await emp.patch(f"{PREFIX}/opportunities/{job['id']}/applications/{application['id']}", json={"status": "shortlisted"})
    assert (await app_.get(f"{PREFIX}/notifications")).json()[0]["text"] == "Your application to Analyst was shortlisted"
