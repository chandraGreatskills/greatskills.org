"""Recommendations: only connections can write them, they show only after the
recipient accepts, and logged-out visitors never see them."""

from tests.test_network import _pair, _send
from tests.test_privacy import PREFIX, _join

TEXT = "Ananya was the most careful analyst in her cohort and always asked the question behind the question."


async def _connected(browser):
    a, me_a, b, me_b = await _pair(browser)
    conn = await _send(a, me_b)
    await b.post(f"{PREFIX}/connections/{conn['id']}/respond?accept=true")
    return a, me_a, b, me_b


def _rec(me, kind="taught", body=TEXT):
    return {"recipient_id": me["id"], "relationship_kind": kind, "body": body}


async def test_only_connections_can_recommend(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    assert (await a.post(f"{PREFIX}/recommendations", json=_rec(me_b))).status_code == 403
    assert (await a.post(f"{PREFIX}/recommendations", json=_rec(me_a))).status_code == 400
    assert (await a.post(f"{PREFIX}/recommendations", json=_rec(me_b, body="too short"))).status_code == 422


async def test_shows_only_after_recipient_accepts(client, browser):
    a, me_a, b, me_b = await _connected(browser)
    r = await a.post(f"{PREFIX}/recommendations", json=_rec(me_b))
    assert r.status_code == 201 and r.json()["status"] == "pending"
    handle_b = me_b["profile"]["handle"]
    assert (await a.get(f"{PREFIX}/profiles/{handle_b}")).json()["recommendations_received"] == []

    mine = (await b.get(f"{PREFIX}/recommendations/me")).json()
    assert mine["received"][0]["status"] == "pending"
    assert mine["received"][0]["person"]["full_name"] == "Asha Rao"
    assert (await b.post(f"{PREFIX}/recommendations/{r.json()['id']}/respond?show=true")).status_code == 200

    shown = (await a.get(f"{PREFIX}/profiles/{handle_b}")).json()["recommendations_received"]
    assert [x["body"] for x in shown] == [TEXT]
    given = (await b.get(f"{PREFIX}/profiles/{me_a['profile']['handle']}")).json()["recommendations_given"]
    assert given[0]["person"]["full_name"] == "Bilal Khan"
    assert (await client.get(f"{PREFIX}/profiles/{handle_b}")).json()["recommendations_received"] == []


async def test_rewrite_goes_back_for_approval_and_hide_works(client, browser):
    a, _, b, me_b = await _connected(browser)
    rid = (await a.post(f"{PREFIX}/recommendations", json=_rec(me_b))).json()["id"]
    await b.post(f"{PREFIX}/recommendations/{rid}/respond?show=true")
    again = await a.post(f"{PREFIX}/recommendations", json=_rec(me_b, "mentored", TEXT + " Updated."))
    assert again.json() == {"id": rid, "status": "pending"}
    await b.post(f"{PREFIX}/recommendations/{rid}/respond?show=false")
    assert (await a.get(f"{PREFIX}/profiles/{me_b['profile']['handle']}")).json()["recommendations_received"] == []


async def test_only_the_two_people_can_act(client, browser):
    a, _, b, me_b = await _connected(browser)
    c, _ = await _join(browser, "chitra@example.com", "Chitra Iyer")
    rid = (await a.post(f"{PREFIX}/recommendations", json=_rec(me_b))).json()["id"]
    assert (await a.post(f"{PREFIX}/recommendations/{rid}/respond?show=true")).status_code == 404
    assert (await c.delete(f"{PREFIX}/recommendations/{rid}")).status_code == 404
    assert (await a.delete(f"{PREFIX}/recommendations/{rid}")).status_code == 204
    assert (await b.get(f"{PREFIX}/recommendations/me")).json()["received"] == []
