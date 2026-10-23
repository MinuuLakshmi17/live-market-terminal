from fastapi.testclient import TestClient
from app.main import app

def test_health_and_quotes():
    with TestClient(app) as c:
        assert c.get("/health").json()["status"]=="ok"
        response=c.get("/api/quotes")
        assert response.status_code==200 and any(q["symbol"]=="AAPL" for q in response.json())
def test_unknown_candle_is_404():
    with TestClient(app) as c: assert c.get("/api/candles/NOPE").status_code==404
