"""Role-specific home pages: each member gets the home for their role, and
the talent list follows the Open to Work privacy rule."""

from tests.test_affiliations import _approved_org, _claim, _confirm, outbox  # noqa: F401
from tests.test_privacy import PREFIX, _join


async def _join_as(browser, email, name, member_type):
    from app.core.security import create_verify_token
    u = browser()
    r = await u.post(f"{PREFIX}/auth/register", json={"email": email, "password": "supersecret1", "full_name": name, "member_type": member_type})
    me = r.json()
    await u.post(f"{PREFIX}/auth/verify-email", json={"token": create_verify_token(me["id"], email)})
    return u, me


async def test_roles_follow_member_type_and_switch(client, browser):
    s, _ = await _join_as(browser, "s@example.com", "Sam Student", "student")
    h = (await s.get(f"{PREFIX}/home")).json()
    assert h["role"] == "student" and [x["label"] for x in h["stats"]] == ["Applied", "In review", "Offers"]

    m, _ = await _join_as(browser, "m@example.com", "Mo Mentor", "mentor")
    assert (await m.get(f"{PREFIX}/home")).json()["role"] == "mentor"

    both, _ = await _join_as(browser, "b@example.com", "Bo Both", "student")
    await both.patch(f"{PREFIX}/profiles/me", json={"open_to_mentor": True})
    h = (await both.get(f"{PREFIX}/home")).json()
    assert h["roles"] == ["mentor", "student"]
    assert (await both.get(f"{PREFIX}/home?as=student")).json()["role"] == "student"
    # Asking for a role you don't have falls back to your own.
    assert (await both.get(f"{PREFIX}/home?as=admin")).json()["role"] == "mentor"


async def test_student_home_matches_openings_to_skills(client, browser):
    poster, _ = await _join_as(browser, "p@example.com", "Pat Poster", "industry")
    for title, skills in (("Data Analyst", ["SQL", "Python"]), ("Chef", ["Cooking"])):
        await poster.post(f"{PREFIX}/opportunities", json={"title": title, "kind": "employment", "skills_wanted": skills})
    s, _ = await _join_as(browser, "s@example.com", "Sam Student", "student")
    await s.patch(f"{PREFIX}/profiles/me", json={"skills": ["python", "Excel"]})
    first = (await s.get(f"{PREFIX}/home")).json()["openings"][0]
    assert first["title"] == "Data Analyst" and first["matched_skills"] == ["Python"]


async def test_employer_home_counts_and_talent_privacy(client, browser, outbox):  # noqa: F811
    await _approved_org("Brightline", "brightline.example", "industry")
    rec, _ = await _join_as(browser, "r@example.com", "Rae Recruiter", "industry")
    job = (await rec.post(f"{PREFIX}/opportunities", json={"title": "Analyst", "kind": "employment", "skills_wanted": ["SQL"]})).json()

    seeker, _ = await _join_as(browser, "j@example.com", "Jo Seeker", "member")
    await seeker.patch(f"{PREFIX}/profiles/me", json={"skills": ["SQL"], "open_to_work": True})
    quiet, _ = await _join_as(browser, "q@example.com", "Quinn Quiet", "member")
    await quiet.patch(f"{PREFIX}/profiles/me", json={"skills": ["SQL"], "open_to_work": False})
    await seeker.post(f"{PREFIX}/opportunities/{job['id']}/apply", json={})

    h = (await rec.get(f"{PREFIX}/home")).json()
    assert h["role"] == "employer"
    assert {x["label"]: x["value"] for x in h["stats"]}["New to review"] == 1
    assert h["openings"][0]["new_applicants"] == 1
    assert h["applications"][0]["person"]["full_name"] == "Jo Seeker"
    # Not verified yet: a skills match that doesn't reveal who is job hunting.
    assert h["people_title"] == "People with the skills you hire for"
    assert {p["person"]["full_name"] for p in h["people"]} == {"Jo Seeker", "Quinn Quiet"}

    _, token = await _claim(rec, outbox, "recruiter", "rae@brightline.example")
    await _confirm(client, token)
    h = (await rec.get(f"{PREFIX}/home")).json()
    assert h["org_name"] == "Brightline"
    assert [p["person"]["full_name"] for p in h["people"]] == ["Jo Seeker"]


async def test_campus_home_shows_own_students_only(client, browser, outbox):  # noqa: F811
    await _approved_org("Lakeview", "lakeview.edu", "academia")
    await _approved_org("Other U", "other.edu", "academia")
    prof, _ = await _join_as(browser, "k@example.com", "Prof Kay", "academia")
    assert (await prof.get(f"{PREFIX}/home")).json()["people_title"].startswith("Verify")
    _, t = await _claim(prof, outbox, "faculty", "kay@lakeview.edu")
    await _confirm(client, t)
    for email, name, school in (("a@example.com", "Ana Mine", "lakeview.edu"), ("o@example.com", "Oli Other", "other.edu")):
        u, _ = await _join_as(browser, email, name, "student")
        _, t = await _claim(u, outbox, "student", f"{name.split()[0].lower()}@{school}")
        await _confirm(client, t)
    h = (await prof.get(f"{PREFIX}/home")).json()
    assert h["role"] == "campus" and h["org_name"] == "Lakeview"
    assert {x["label"]: x["value"] for x in h["stats"]}["Verified students"] == 1
    assert [p["person"]["full_name"] for p in h["people"]] == ["Ana Mine"]


async def test_admin_home(client, browser):
    from sqlalchemy import update
    from app.db.base import SessionLocal
    from app.models.user import User
    a, me = await _join(browser, "admin@example.com", "Ad Min")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.email == "admin@example.com").values(role="admin"))
        await db.commit()
    h = (await a.get(f"{PREFIX}/home")).json()
    assert h["role"] == "admin" and h["stats"][0]["label"] == "Organizations to review"
