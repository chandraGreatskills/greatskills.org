"""The Network page: each card knows where the viewer stands, requests can be
accepted, withdrawn or removed, and the home page counts are real totals."""

from tests.test_privacy import PREFIX, _join


async def _pair(browser):
    a, me_a = await _join(browser, "asha@example.com", "Asha Rao")
    b, me_b = await _join(browser, "bilal@example.com", "Bilal Khan")
    return a, me_a, b, me_b


async def _card(c, name):
    cards = (await c.get(f"{PREFIX}/members")).json()
    return next(x for x in cards if x["full_name"] == name)


async def _send(a, me_b):
    r = await a.post(f"{PREFIX}/connections", json={"addressee_id": me_b["id"], "message": "Hi"})
    assert r.status_code == 201, r.text
    return r.json()


async def test_cards_show_connection_state_from_both_sides(client, browser):
    a, _, b, me_b = await _pair(browser)
    assert (await _card(a, "Bilal Khan"))["connection"] == "none"
    conn = await _send(a, me_b)
    sent = await _card(a, "Bilal Khan")
    assert sent["connection"] == "sent" and sent["connection_id"] == conn["id"]
    assert (await _card(b, "Asha Rao"))["connection"] == "received"
    await b.post(f"{PREFIX}/connections/{conn['id']}/respond?accept=true")
    assert (await _card(a, "Bilal Khan"))["connection"] == "connected"
    assert (await _card(b, "Asha Rao"))["connection"] == "connected"


async def test_discover_leaves_out_existing_connections(client, browser):
    a, _, b, me_b = await _pair(browser)
    await _join(browser, "chitra@example.com", "Chitra Iyer")
    conn = await _send(a, me_b)
    await b.post(f"{PREFIX}/connections/{conn['id']}/respond?accept=true")
    names = {x["full_name"] for x in (await a.get(f"{PREFIX}/members?scope=discover")).json()}
    assert names == {"Chitra Iyer"}


async def test_discover_leaves_out_pending_requests_both_ways(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    c, me_c = await _join(browser, "chitra@example.com", "Chitra Iyer")
    await _join(browser, "dev@example.com", "Dev Lal")
    await _send(a, me_b)           # a sent to b
    await _send(c, me_a)           # c sent to a
    names = {x["full_name"] for x in (await a.get(f"{PREFIX}/members?scope=discover")).json()}
    assert names == {"Dev Lal"}
    # the full directory still lists everyone, with the right state
    assert (await _card(a, "Chitra Iyer"))["connection"] == "received"


async def test_discover_counts_mutual_connections(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    c, me_c = await _join(browser, "chitra@example.com", "Chitra Iyer")
    d, me_d = await _join(browser, "dev@example.com", "Dev Lal")
    for x, other in ((a, me_b), (a, me_c), (d, me_b), (d, me_c)):
        conn = await _send(x, other)
        responder = b if other is me_b else c
        await responder.post(f"{PREFIX}/connections/{conn['id']}/respond?accept=true")
    cards = (await a.get(f"{PREFIX}/members?scope=discover")).json()
    assert [(x["full_name"], x["mutual_connections"]) for x in cards] == [("Dev Lal", 2)]
    assert {m["full_name"] for m in cards[0]["mutual_sample"]} == {"Bilal Khan", "Chitra Iyer"}
    full = (await a.get(f"{PREFIX}/members/{me_d['id']}/mutual")).json()
    assert [m["full_name"] for m in full] == ["Bilal Khan", "Chitra Iyer"]
    assert set(full[0]) == {"user_id", "handle", "full_name", "avatar_url", "headline"}


async def test_cards_show_shared_skills(client, browser):
    a, _, b, _ = await _pair(browser)
    await a.patch(f"{PREFIX}/profiles/me", json={"skills": ["Python", "SQL", "Excel"]})
    await b.patch(f"{PREFIX}/profiles/me", json={"skills": ["sql", "Java", "Python"]})
    assert (await _card(a, "Bilal Khan"))["shared_skills"] == ["sql", "Python"]


async def test_mutual_list_needs_sign_in(client, browser):
    _, _, _, me_b = await _pair(browser)
    assert (await client.get(f"{PREFIX}/members/{me_b['id']}/mutual")).status_code == 401
    lone, _ = await _join(browser, "eve@example.com", "Eve Moss")
    assert all(x["mutual_connections"] == 0 for x in (await lone.get(f"{PREFIX}/members")).json())


async def test_connecting_back_accepts_their_request(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    conn = await _send(a, me_b)
    r = await b.post(f"{PREFIX}/connections", json={"addressee_id": me_a["id"]})
    assert r.status_code == 201
    assert r.json()["id"] == conn["id"] and r.json()["status"] == "accepted"


async def test_declined_request_still_reads_as_sent(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    conn = await _send(a, me_b)
    await b.post(f"{PREFIX}/connections/{conn['id']}/respond?accept=false")
    assert (await _card(a, "Bilal Khan"))["connection"] == "sent"
    assert (await _card(b, "Asha Rao"))["connection"] == "none"
    # the one who declined can change their mind later
    r = await b.post(f"{PREFIX}/connections", json={"addressee_id": me_a["id"]})
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert (await _card(a, "Bilal Khan"))["connection"] == "received"


async def test_network_tabs_and_summary(client, browser):
    a, _, b, me_b = await _pair(browser)
    _, me_c = await _join(browser, "chitra@example.com", "Chitra Iyer")
    await _send(a, me_b)
    await _send(a, me_c)

    sent = (await a.get(f"{PREFIX}/connections/network?view=sent")).json()
    assert {x["member"]["full_name"] for x in sent} == {"Bilal Khan", "Chitra Iyer"}
    received = (await b.get(f"{PREFIX}/connections/network?view=received")).json()
    assert [x["member"]["full_name"] for x in received] == ["Asha Rao"]
    assert received[0]["message"] == "Hi"

    await b.post(f"{PREFIX}/connections/{received[0]['id']}/respond?accept=true")
    mine = (await a.get(f"{PREFIX}/connections/network")).json()
    assert [x["member"]["full_name"] for x in mine] == ["Bilal Khan"]
    assert (await a.get(f"{PREFIX}/connections/summary")).json() == {
        "connections": 1, "received": 0, "sent": 1
    }


async def test_withdraw_and_remove(client, browser):
    a, _, b, me_b = await _pair(browser)
    conn = await _send(a, me_b)
    # the person asked can't "withdraw" someone else's request
    assert (await b.delete(f"{PREFIX}/connections/{conn['id']}")).status_code == 404
    assert (await a.delete(f"{PREFIX}/connections/{conn['id']}")).status_code == 204
    assert (await _card(a, "Bilal Khan"))["connection"] == "none"

    conn = await _send(a, me_b)
    await b.post(f"{PREFIX}/connections/{conn['id']}/respond?accept=true")
    # either side may remove a connection
    assert (await b.delete(f"{PREFIX}/connections/{conn['id']}")).status_code == 204
    assert (await _card(a, "Bilal Khan"))["connection"] == "none"


async def test_profile_view_carries_state_and_owner_preview(client, browser):
    a, me_a, b, me_b = await _pair(browser)
    await a.patch(f"{PREFIX}/profiles/me", json={"bio": "x" * 400, "skills": ["A", "B", "C", "D"]})
    handle = me_a["profile"]["handle"]
    await _send(a, me_b)
    assert (await b.get(f"{PREFIX}/profiles/{handle}")).json()["connection"] == "received"

    public = (await a.get(f"{PREFIX}/profiles/{handle}?as=public")).json()
    assert public["viewer"] == "public" and public["skills_truncated"] is True
    assert (await a.get(f"{PREFIX}/profiles/{handle}?as=member")).json()["viewer"] == "member"
    # ?as= never changes what someone else sees
    assert (await b.get(f"{PREFIX}/profiles/{handle}?as=connection")).json()["viewer"] == "member"


async def test_open_count_is_a_real_total(client, browser):
    a, _, _, _ = await _pair(browser)
    for i in range(25):
        r = await a.post(f"{PREFIX}/opportunities", json={"title": f"Role {i}", "kind": "internship"})
        assert r.status_code == 201, r.text
    assert len((await a.get(f"{PREFIX}/opportunities")).json()) == 20
    assert (await a.get(f"{PREFIX}/opportunities/count")).json() == {"open": 25}
    first = (await a.get(f"{PREFIX}/opportunities?limit=1")).json()[0]
    assert "created_at" in first
