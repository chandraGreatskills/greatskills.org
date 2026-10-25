"""Openings over their life: posted, found, saved, applied to, reviewed by
the poster, and closed by date or by hand."""

from datetime import datetime, timedelta, timezone

from tests.test_privacy import PDF, PREFIX, _join


def _iso(days: float) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def _post(c, **body):
    r = await c.post(f"{PREFIX}/opportunities", json={"title": "Data Intern", "kind": "internship", **body})
    assert r.status_code == 201, r.text
    return r.json()


async def _titles(c, query=""):
    return [o["title"] for o in (await c.get(f"{PREFIX}/opportunities{query}")).json()]


async def test_listing_carries_poster_dates_and_counts(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    stu, _ = await _join(browser, "stu@example.com", "Sana Student")
    opp = await _post(hr, closes_at=_iso(10), pay="Rs 15,000 a month", eligibility="Final year")
    await stu.post(f"{PREFIX}/opportunities/{opp['id']}/apply", json={})

    o = (await stu.get(f"{PREFIX}/opportunities")).json()[0]
    assert o["poster"]["full_name"] == "Hiring Desk"
    assert o["pay"] == "Rs 15,000 a month" and o["eligibility"] == "Final year"
    assert o["closes_at"] and o["created_at"] and o["is_open"] is True
    assert o["applicants"] == 1 and o["applied_status"] == "submitted"
    assert o["mine"] is False
    assert (await hr.get(f"{PREFIX}/opportunities/{opp['id']}")).json()["mine"] is True


async def test_closing_date_in_the_past_is_refused(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    r = await hr.post(f"{PREFIX}/opportunities", json={"title": "Old role", "closes_at": _iso(-1)})
    assert r.status_code == 422


async def test_expired_openings_drop_out_on_their_own(client, browser, monkeypatch):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    stu, _ = await _join(browser, "stu@example.com", "Sana Student")
    soon = await _post(hr, title="Closes soon", closes_at=_iso(1))
    await _post(hr, title="No end date")
    assert set(await _titles(stu)) == {"Closes soon", "No end date"}

    # Jump two days ahead: no job ran, the listing just reads as closed.
    later = datetime.now(timezone.utc) + timedelta(days=2)
    monkeypatch.setattr("app.api.routes.opportunities.utcnow", lambda: later)
    assert await _titles(stu) == ["No end date"]
    assert (await stu.get(f"{PREFIX}/opportunities/count")).json() == {"open": 1}
    detail = (await stu.get(f"{PREFIX}/opportunities/{soon['id']}")).json()
    assert detail["is_open"] is False
    r = await stu.post(f"{PREFIX}/opportunities/{soon['id']}/apply", json={})
    assert r.status_code == 404
    # the poster still sees it under their own listings
    assert "Closes soon" in await _titles(hr, "?mine=true")


async def test_same_title_twice_is_a_duplicate(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    first = await _post(hr, title="Supply Chain Intern")
    r = await hr.post(f"{PREFIX}/opportunities", json={"title": "supply chain intern "})
    assert r.status_code == 409
    # once the first is closed the title is free again
    await hr.patch(f"{PREFIX}/opportunities/{first['id']}", json={"status": "closed"})
    await _post(hr, title="Supply Chain Intern")


async def test_only_the_poster_edits(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    other, _ = await _join(browser, "x@example.com", "Someone Else")
    opp = await _post(hr)
    assert (await other.patch(f"{PREFIX}/opportunities/{opp['id']}", json={"title": "Mine now"})).status_code == 404
    r = await hr.patch(f"{PREFIX}/opportunities/{opp['id']}", json={"title": "Data Analyst Intern", "pay": "Paid"})
    assert r.status_code == 200 and r.json()["title"] == "Data Analyst Intern"
    r = await hr.patch(f"{PREFIX}/opportunities/{opp['id']}", json={"status": "closed"})
    assert r.json()["is_open"] is False
    assert await _titles(other) == []


async def test_filters(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    await _post(hr, title="Remote Python role", remote=True, description="Django and SQL")
    await _post(hr, title="Pune ops", location="Pune, Maharashtra", pay="Rs 12,000")
    await _post(hr, title="Closing this week", closes_at=_iso(3))
    await _post(hr, title="Closing next month", closes_at=_iso(30))
    assert await _titles(hr, "?q=django") == ["Remote Python role"]
    assert await _titles(hr, "?remote=true") == ["Remote Python role"]
    assert await _titles(hr, "?location=pune") == ["Pune ops"]
    assert await _titles(hr, "?paid=true") == ["Pune ops"]
    assert await _titles(hr, "?closing_soon=true") == ["Closing this week"]
    assert (await _titles(hr, "?sort=closing"))[:2] == ["Closing this week", "Closing next month"]


async def test_save_and_unsave(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    stu, _ = await _join(browser, "stu@example.com", "Sana Student")
    a = await _post(hr, title="Saved one")
    await _post(hr, title="Not saved")
    assert (await stu.put(f"{PREFIX}/opportunities/{a['id']}/save")).status_code == 204
    assert (await stu.put(f"{PREFIX}/opportunities/{a['id']}/save")).status_code == 204  # idempotent
    assert await _titles(stu, "?saved=true") == ["Saved one"]
    assert (await stu.get(f"{PREFIX}/opportunities/{a['id']}")).json()["saved"] is True
    await stu.delete(f"{PREFIX}/opportunities/{a['id']}/save")
    assert await _titles(stu, "?saved=true") == []
    assert (await client.get(f"{PREFIX}/opportunities?saved=true")).status_code == 401


async def test_apply_review_and_track(client, browser):
    hr, _ = await _join(browser, "hr@example.com", "Hiring Desk")
    stu, _ = await _join(browser, "stu@example.com", "Sana Student")
    other, _ = await _join(browser, "x@example.com", "Someone Else")
    resume = (await stu.post(f"{PREFIX}/profiles/me/resume", files={"file": ("cv.pdf", PDF, "application/pdf")})).json()
    opp = await _post(hr)
    assert (await hr.post(f"{PREFIX}/opportunities/{opp['id']}/apply", json={})).status_code == 400

    r = await stu.post(f"{PREFIX}/opportunities/{opp['id']}/apply",
                       json={"cover_note": "Keen on this", "resume_id": resume["id"]})
    assert r.status_code == 201

    # only the poster sees applicants and their resumes
    assert (await other.get(f"{PREFIX}/opportunities/{opp['id']}/applications")).status_code == 404
    apps = (await hr.get(f"{PREFIX}/opportunities/{opp['id']}/applications")).json()
    assert len(apps) == 1 and apps[0]["cover_note"] == "Keen on this"
    assert apps[0]["has_resume"] and apps[0]["member"]["full_name"] == "Sana Student"
    app_id = apps[0]["id"]
    assert (await other.get(f"{PREFIX}/opportunities/{opp['id']}/applications/{app_id}/resume")).status_code == 404
    file = await hr.get(f"{PREFIX}/opportunities/{opp['id']}/applications/{app_id}/resume")
    assert file.status_code == 200 and file.content == PDF
    assert "attachment" in file.headers["content-disposition"]

    r = await hr.patch(f"{PREFIX}/opportunities/{opp['id']}/applications/{app_id}", json={"status": "shortlisted"})
    assert r.status_code == 200
    mine = (await stu.get(f"{PREFIX}/opportunities/applications/mine")).json()
    assert [(m["status"], m["opportunity"]["title"]) for m in mine] == [("shortlisted", "Data Intern")]
