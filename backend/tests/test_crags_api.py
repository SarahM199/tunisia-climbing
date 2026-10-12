from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_crags_returns_200():
    response = client.get("/crags")
    assert response.status_code == 200


def test_list_crags_returns_a_list():
    response = client.get("/crags")
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_single_crag():
    response = client.get("/crags/1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == "Djebel Ressas"
    assert "sectors" in data
    assert isinstance(data["sectors"], list)


def test_get_nonexistent_crag_returns_error():
    response = client.get("/crags/99999")
    data = response.json()
    assert "error" in data


def test_get_sector_includes_parent_crag_name():
    response = client.get("/sectors/3")
    assert response.status_code == 200
    data = response.json()
    assert data["crag_name"] == "Djebel Ressas"
    assert "routes" in data


def test_get_route_includes_full_breadcrumb():
    response = client.get("/routes/1")
    assert response.status_code == 200
    data = response.json()
    assert "sector_name" in data
    assert "crag_name" in data