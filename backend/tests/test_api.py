import os
import tempfile

os.environ["JALDROP_DB"] = os.path.join(tempfile.mkdtemp(), "t.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def test_catalog_and_serviceability():
    with TestClient(app) as c:
        cat = c.get("/api/catalog").json()
        assert cat["deposit_per_jar"] == 350
        # pass must always be cheaper per jar than a single jar
        per = {p["id"]: p["per_jar"] for p in cat["products"]}
        assert per["pass10"] < per["single"] and per["pass20"] < per["pass10"]
        assert c.get("/api/serviceability/400053").json()["zone"] == "Andheri West"
        assert c.get("/api/serviceability/110001").json()["status"] == "unserved"
        assert c.get("/api/serviceability/12").json()["valid"] is False


def test_lead_validation():
    with TestClient(app) as c:
        ok = c.post("/api/leads", json={"kind": "waitlist", "name": "Asha", "phone": "+91 98200 12345", "pincode": "400053"})
        assert ok.status_code == 201
        assert c.post("/api/leads", json={"kind": "waitlist", "name": "Asha", "phone": "12345"}).status_code == 422
        assert c.post("/api/leads", json={"kind": "hack", "name": "Asha", "phone": "9820012345"}).status_code == 422
