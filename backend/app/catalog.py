"""Static catalog: pricing and the zones we serve. Source of truth for the website."""

DEPOSIT_PER_JAR = 350

PRODUCTS = [
    {
        "id": "single",
        "name": "Single jar",
        "jars": 1,
        "price": 65,
        "per_jar": 65,
        "validity_days": None,
        "tagline": "Try us once",
        "highlight": False,
    },
    {
        "id": "pass10",
        "name": "10-Jar Pass",
        "jars": 10,
        "price": 600,
        "per_jar": 60,
        "validity_days": 60,
        "tagline": "Most popular",
        "highlight": True,
    },
    {
        "id": "pass20",
        "name": "20-Jar Pass",
        "jars": 20,
        "price": 1140,
        "per_jar": 57,
        "validity_days": 90,
        "tagline": "Best value",
        "highlight": False,
    },
]

ZONES = [
    {"id": "andheri-w", "name": "Andheri West", "areas": ["Lokhandwala", "Four Bungalows"],
     "pincodes": ["400053", "400058"], "status": "launching"},
    {"id": "powai", "name": "Powai", "areas": ["Hiranandani", "Chandivali"],
     "pincodes": ["400076"], "status": "waitlist"},
    {"id": "malad-w", "name": "Malad West", "areas": ["Mindspace belt"],
     "pincodes": ["400064"], "status": "waitlist"},
    {"id": "thane", "name": "Thane", "areas": ["Ghodbunder Road"],
     "pincodes": ["400607", "400615"], "status": "waitlist"},
]
