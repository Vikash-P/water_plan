import os
import tempfile

os.environ["JALDROP_DB"] = os.path.join(tempfile.mkdtemp(), "p.db")
os.environ["JALDROP_ADMIN_KEY"] = "test-key"
os.environ["JALDROP_DEV_OTP"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

ADMIN = {"X-Admin-Key": "test-key"}
PHONE = "9830011111"
L = {"name": "Aqua Pure 20L", "size_litres": 20, "price": 58, "pincodes": "400053, 400058"}


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


def test_order_from_partner_listing_and_delivery():
    ph = "9830044444"
    order = {"name": "Priya Nair", "phone": "9830055555", "pincode": "400053", "society": "Lokhandwala Heights",
             "flat": "1202", "jars_now": 2, "slot": "asap"}
    with TestClient(app) as c:
        login(c, ph)
        c.post("/api/admin/partners", headers=ADMIN, json={"phone": ph, "business_name": "Delta Water", "contact_name": "Omar"})
        lid = c.post("/api/partner/listings", json={**L, "pincodes": "400053"}).json()["id"]
        # not approved yet, so it can't be ordered
        assert c.post("/api/orders", json={**order, "listing_id": lid}).status_code == 422
        c.patch(f"/api/admin/listings/{lid}", headers=ADMIN, json={"status": "approved"})
        # wrong pincode for this partner
        assert c.post("/api/orders", json={**order, "listing_id": lid, "pincode": "400058"}).status_code == 422
        r = c.post("/api/orders", json={**order, "listing_id": lid})
        assert r.status_code == 201
        o = r.json()
        assert o["product"] == "Aqua Pure 20L" and o["amount"] == 116 and o["deposit"] == 700
        mine = c.get("/api/partner/orders").json()["orders"]
        assert mine[0]["code"] == o["code"] and "phone" not in mine[0] and mine[0]["next_status"] is None
        # partner can't jump ahead of ops confirmation
        assert c.patch(f"/api/partner/orders/{o['code']}", json={"status": "delivered"}).status_code == 409
        board = c.get("/api/admin/orders", headers=ADMIN).json()["orders"]
        oid = next(x["id"] for x in board if x["code"] == o["code"])
        assert next(x for x in board if x["code"] == o["code"])["partner_name"] == "Delta Water"
        c.patch(f"/api/admin/orders/{oid}", headers=ADMIN, json={"status": "confirmed"})
        assert c.patch(f"/api/partner/orders/{o['code']}", json={"status": "out_for_delivery"}).json()["status"] == "out_for_delivery"
        assert c.patch(f"/api/partner/orders/{o['code']}", json={"status": "delivered"}).json()["status"] == "delivered"
    with TestClient(app) as c2:  # another partner can't touch it
        login(c2, "9830066666")
        c2.post("/api/admin/partners", headers=ADMIN, json={"phone": "9830066666", "business_name": "Other Co", "contact_name": "Sam"})
        assert c2.patch(f"/api/partner/orders/{o['code']}", json={"status": "delivered"}).status_code == 404


def test_partner_password_flow():
    ph = "9830077777"
    with TestClient(app) as c:
        r = c.post("/api/admin/partners", headers=ADMIN, json={"phone": ph, "business_name": "Clear Springs", "contact_name": "Neha"})
        assert r.status_code == 201 and r.json()["partner_id"] == ph and "setup_code" not in r.json()
        assert c.post("/api/partner/auth/login", json={"phone": ph, "password": "whatever1"}).status_code == 401
        # unknown number and short password are refused
        assert c.post("/api/partner/auth/setup", json={"phone": "9830000001", "password": "goodpass123"}).status_code == 400
        assert c.post("/api/partner/auth/setup", json={"phone": ph, "password": "short"}).status_code == 422
        assert c.post("/api/partner/auth/setup", json={"phone": ph, "password": "goodpass123"}).status_code == 200
        assert c.get("/api/partner/me").json()["business_name"] == "Clear Springs"  # setup also logs in
        # only once: nobody can overwrite the password afterwards
        assert c.post("/api/partner/auth/setup", json={"phone": ph, "password": "otherpass123"}).status_code == 400
    with TestClient(app) as c2:
        assert c2.post("/api/partner/auth/login", json={"phone": ph, "password": "nope-nope"}).status_code == 401
        assert c2.post("/api/partner/auth/login", json={"phone": ph, "password": "goodpass123"}).status_code == 200
        assert c2.get("/api/partner/me").status_code == 200
        pid = next(x["id"] for x in c2.get("/api/admin/partners", headers=ADMIN).json()["partners"] if x["phone"] == ph)
        assert c2.post(f"/api/admin/partners/{pid}/reset", headers=ADMIN).status_code == 200
        assert c2.get("/api/partner/me").status_code == 401  # reset logs them out
        assert c2.post("/api/partner/auth/login", json={"phone": ph, "password": "goodpass123"}).status_code == 401
        assert c2.post("/api/partner/auth/setup", json={"phone": ph, "password": "brandnew123"}).status_code == 200


def test_partner_lockout_after_five_failures():
    ph = "9830088888"
    with TestClient(app) as c:
        c.post("/api/admin/partners", headers=ADMIN, json={"phone": ph, "business_name": "Lock Test", "contact_name": "Ali"})
        c.post("/api/partner/auth/setup", json={"phone": ph, "password": "rightpass123"})
        for _ in range(5):
            assert c.post("/api/partner/auth/login", json={"phone": ph, "password": "wrong-pass"}).status_code == 401
        assert c.post("/api/partner/auth/login", json={"phone": ph, "password": "rightpass123"}).status_code == 429


def test_admin_id_password_login():
    with TestClient(app) as c:
        assert c.get("/api/admin/orders").status_code == 401
        assert c.post("/api/admin/login", json={"user": "admin", "password": "wrong"}).status_code == 401
        assert c.post("/api/admin/login", json={"user": "boss", "password": "test-key"}).status_code == 401
        assert c.post("/api/admin/login", json={"user": "admin", "password": "test-key"}).status_code == 200
        assert c.get("/api/admin/orders").status_code == 200          # cookie session works
        assert c.get("/api/admin/partners").status_code == 200
        c.post("/api/admin/logout")
        assert c.get("/api/admin/orders").status_code == 401
    with TestClient(app) as c2:
        assert c2.get("/api/admin/orders", headers={"X-Admin-Key": "test-key"}).status_code == 200  # scripts still work
        c2.cookies.set("jd_admin", "9999999999.deadbeef")
        assert c2.get("/api/admin/orders").status_code == 401  # forged cookie rejected
