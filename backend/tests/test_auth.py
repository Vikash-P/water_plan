import os
import tempfile

os.environ["JALDROP_DB"] = os.path.join(tempfile.mkdtemp(), "a.db")
os.environ["JALDROP_ADMIN_KEY"] = "test-key"
os.environ["JALDROP_DEV_OTP"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

PHONE = "9820055555"
ORDER = {"name": "Priya Nair", "phone": PHONE, "pincode": "400053", "society": "Lokhandwala Heights",
         "tower": "4", "flat": "1202", "product_id": "single", "jars_now": 2, "slot": "asap"}
ADMIN = {"X-Admin-Key": "test-key"}


def login(c, phone=PHONE):
    code = c.post("/api/auth/otp/request", json={"phone": phone}).json()["dev_code"]
    return c.post("/api/auth/otp/verify", json={"phone": phone, "code": code})


def test_me_requires_login():
    with TestClient(app) as c:
        assert c.get("/api/me").status_code == 401


def test_wrong_code_then_attempt_limit():
    with TestClient(app) as c:
        c.post("/api/auth/otp/request", json={"phone": "9820066666"})
        for _ in range(5):
            assert c.post("/api/auth/otp/verify", json={"phone": "9820066666", "code": "000000"}).status_code == 400
        # sixth try is locked out even if it were right
        assert "expired" in c.post("/api/auth/otp/verify", json={"phone": "9820066666", "code": "000000"}).json()["detail"]


def test_resend_gap_and_cookie_session_flow():
    with TestClient(app) as c:
        assert c.post("/api/auth/otp/request", json={"phone": PHONE}).status_code == 200
        assert c.post("/api/auth/otp/request", json={"phone": PHONE}).status_code == 429
        c.cookies.clear()
        r = login(c, "9820077777")
        assert r.status_code == 200 and "httponly" in r.headers["set-cookie"].lower()
        me = c.get("/api/me").json()
        assert me["phone"] == "9820077777" and me["orders"] == [] and me["address"] is None


def test_refill_and_active_order_flow():
    with TestClient(app) as c:
        first = c.post("/api/orders", json={**ORDER, "phone": "9820088888"}).json()
        login(c, "9820088888")
        me = c.get("/api/me").json()
        assert me["active_order"]["code"] == first["code"] and me["address"]["flat"] == "1202"
        assert c.post("/api/me/refill", json={"jars": 2}).status_code == 409  # one already on the way
        # deliver it, then refill
        oid = c.get("/api/admin/orders", headers=ADMIN).json()["orders"][0]["id"]
        for st in ("confirmed", "out_for_delivery", "delivered"):
            assert c.patch(f"/api/admin/orders/{oid}", json={"status": st}, headers=ADMIN).status_code == 200
        r = c.post("/api/me/refill", json={"jars": 2})
        assert r.status_code == 201 and r.json()["deposit"] == 0 and r.json()["amount"] == 130


def test_logout_ends_session():
    with TestClient(app) as c:
        login(c, "9820099999")
        assert c.get("/api/me").status_code == 200
        c.post("/api/auth/logout")
        assert c.get("/api/me").status_code == 401
