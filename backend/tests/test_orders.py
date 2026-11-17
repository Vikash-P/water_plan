import os
import tempfile

os.environ["JALDROP_DB"] = os.path.join(tempfile.mkdtemp(), "o.db")
os.environ["JALDROP_ADMIN_KEY"] = "test-key"
os.environ["JALDROP_DEV_OTP"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

BASE = {"name": "Asha Rao", "phone": "98200 12345", "pincode": "400053", "society": "Lokhandwala Heights",
        "tower": "B", "flat": "1204", "product_id": "single", "jars_now": 2, "slot": "asap"}
ADMIN = {"X-Admin-Key": "test-key"}


def place(c, **over):
    return c.post("/api/orders", json={**BASE, **over})


def test_place_prices_and_deposit():
    with TestClient(app) as c:
        r = place(c)
        assert r.status_code == 201
        o = r.json()
        assert o["code"].startswith("JD") and o["status"] == "requested"
        assert (o["amount"], o["deposit"], o["total_due"]) == (130, 700, 830)  # 2 x 65 + 2 x 350
        # already holds jars -> no deposit; pass is bought once
        o2 = place(c, has_jars=True, product_id="pass10", jars_now=1).json()
        assert (o2["amount"], o2["deposit"]) == (600, 0)


def test_rejects_bad_input_and_unserved_areas():
    with TestClient(app) as c:
        assert place(c, pincode="400076").status_code == 422   # waitlist zone
        assert place(c, pincode="110001").status_code == 422   # not served
        assert place(c, product_id="nope").status_code == 422
        assert place(c, slot="midnight").status_code == 422
        assert place(c, phone="123").status_code == 422
        assert place(c, jars_now=0).status_code == 422


def test_track_needs_matching_phone():
    with TestClient(app) as c:
        code = place(c).json()["code"]
        assert c.get(f"/api/orders/{code}", params={"phone": "9820012345"}).status_code == 200
        assert c.get(f"/api/orders/{code.lower()}", params={"phone": "+919820012345"}).status_code == 200
        assert c.get(f"/api/orders/{code}", params={"phone": "9999999999"}).status_code == 404
        assert c.get("/api/orders/JDNOPE00", params={"phone": "9820012345"}).status_code == 404


def test_customer_cancel_rules():
    with TestClient(app) as c:
        o = place(c).json()
        assert c.post(f"/api/orders/{o['code']}/cancel", json={"phone": "9111111111"}).status_code == 404
        r = c.post(f"/api/orders/{o['code']}/cancel", json={"phone": "9820012345"})
        assert r.status_code == 200 and r.json()["status"] == "cancelled"
        assert c.post(f"/api/orders/{o['code']}/cancel", json={"phone": "9820012345"}).status_code == 409


def test_admin_auth_and_status_flow():
    with TestClient(app) as c:
        assert c.get("/api/admin/orders").status_code == 401
        assert c.get("/api/admin/orders", headers={"X-Admin-Key": "wrong"}).status_code == 401
        place(c)
        orders = c.get("/api/admin/orders", headers=ADMIN).json()["orders"]
        oid = orders[0]["id"]
        assert orders[0]["phone"] and orders[0]["next_statuses"] == ["cancelled", "confirmed"]
        patch = lambda s: c.patch(f"/api/admin/orders/{oid}", json={"status": s}, headers=ADMIN)
        assert patch("delivered").status_code == 409       # can't skip steps
        for s in ("confirmed", "out_for_delivery", "delivered"):
            assert patch(s).status_code == 200
        assert patch("cancelled").status_code == 409        # delivered is final


def test_admin_disabled_without_key(monkeypatch):
    monkeypatch.delenv("JALDROP_ADMIN_KEY")
    with TestClient(app) as c:
        assert c.get("/api/admin/orders", headers=ADMIN).status_code == 503


def test_saved_addresses_need_login_and_are_deduplicated():
    with TestClient(app) as c:
        assert c.get("/api/me/addresses").status_code == 401  # a phone number alone never reveals an address
        place(c, phone="9811122233")
        place(c, phone="9811122233")  # same address again
        place(c, phone="9811122233", flat="1305")
        r = c.post("/api/auth/otp/request", json={"phone": "9811122233"})
        assert r.status_code == 200, r.text
        code = r.json()["dev_code"]
        assert c.post("/api/auth/otp/verify", json={"phone": "9811122233", "code": code}).status_code == 200
        d = c.get("/api/me/addresses").json()
        assert d["name"] == "Asha Rao" and [a["flat"] for a in d["addresses"]] == ["1305", "1204"]
