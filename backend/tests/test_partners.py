import os
import tempfile

os.environ["JALDROP_DB"] = os.path.join(tempfile.mkdtemp(), "p.db")
os.environ["JALDROP_ADMIN_KEY"] = "test-key"
os.environ["JALDROP_DEV_OTP"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

ADMIN = {"X-Admin-Key": "test-key"}
PHONE = "9830011111"
L = {"name": "Aqua Pure 20L", "brand": "AquaPure", "size_litres": 20, "price": 58, "pincodes": "400053, 400058"}


def login(c, phone):
    r = c.post("/api/auth/otp/request", json={"phone": phone})
    assert r.status_code == 200, r.text
    code = r.json()["dev_code"]
    assert c.post("/api/auth/otp/verify", json={"phone": phone, "code": code}).status_code == 200


def test_partner_listing_review_flow():
    with TestClient(app) as c:
        login(c, PHONE)
        assert c.get("/api/partner/me").status_code == 403  # logged in but not a partner
        assert c.post("/api/admin/partners", json={"phone": PHONE, "business_name": "Aqua Pure", "contact_name": "Ravi"}).status_code == 401
        assert c.post("/api/admin/partners", headers=ADMIN, json={"phone": PHONE, "business_name": "Aqua Pure", "contact_name": "Ravi"}).status_code == 201
        assert c.get("/api/partner/me").json()["listings"] == []
        r = c.post("/api/partner/listings", json=L)
        assert r.status_code == 201 and r.json()["status"] == "pending"
        lid = r.json()["id"]
        assert r.json()["pincodes"] == ["400053", "400058"]
        assert c.get("/api/listings").json()["listings"] == []  # pending is not public
        assert c.patch(f"/api/admin/listings/{lid}", headers=ADMIN, json={"status": "approved"}).status_code == 200
        pub = c.get("/api/listings").json()["listings"]
        assert len(pub) == 1 and pub[0]["price"] == 58 and pub[0]["partner"] == "Aqua Pure"
        # editing sends it back to review and hides it
        assert c.patch(f"/api/partner/listings/{lid}", json={**L, "price": 40}).json()["status"] == "pending"
        assert c.get("/api/listings").json()["listings"] == []
        assert c.delete(f"/api/partner/listings/{lid}").status_code == 200


def test_validation_and_isolation():
    with TestClient(app) as c:
        login(c, "9830022222")
        c.post("/api/admin/partners", headers=ADMIN, json={"phone": "9830022222", "business_name": "Blue Spring", "contact_name": "Mina"})
        assert c.post("/api/partner/listings", json={**L, "price": 0}).status_code == 422
        assert c.post("/api/partner/listings", json={**L, "pincodes": "12345"}).status_code == 422
    with TestClient(app) as c2:
        login(c2, "9830033333")
        c2.post("/api/admin/partners", headers=ADMIN, json={"phone": "9830033333", "business_name": "Other Co", "contact_name": "Sam"})
        assert c2.patch("/api/partner/listings/9999", json=L).status_code == 404
