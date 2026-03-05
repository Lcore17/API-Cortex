import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_stats():
    response = client.get("/api/stats")
    assert response.status_code == 200
    data = response.json()
    assert "active_threats" in data
    assert "total_requests" in data

def test_simulate():
    response = client.post("/api/simulate?attack_type=sqli")
    assert response.status_code == 200
    assert response.json()["status"] == "queued"

def test_threats():
    response = client.get("/api/threats")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
