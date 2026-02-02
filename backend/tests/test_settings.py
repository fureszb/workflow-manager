def test_get_settings_empty(client):
    response = client.get("/api/v1/settings")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)


def test_put_single_setting(client):
    response = client.put("/api/v1/settings/theme", json={"value": "dark"})
    assert response.status_code == 200
    assert response.json() == {"key": "theme", "value": "dark"}


def test_get_setting_by_key(client):
    client.put("/api/v1/settings/lang", json={"value": "hu"})
    response = client.get("/api/v1/settings/lang")
    assert response.status_code == 200
    assert response.json()["value"] == "hu"


def test_get_setting_missing(client):
    response = client.get("/api/v1/settings/nonexistent")
    assert response.status_code == 200
    assert response.json()["value"] is None


def test_put_bulk_settings(client):
    response = client.put("/api/v1/settings", json={
        "openrouter_api_key": "sk-test-123",
        "ollama_base_url": "http://localhost:11434",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["openrouter_api_key"] == "sk-test-123"
    assert data["ollama_base_url"] == "http://localhost:11434"


def test_put_bulk_updates_existing(client):
    client.put("/api/v1/settings/mykey", json={"value": "old"})
    response = client.put("/api/v1/settings", json={"mykey": "new"})
    assert response.status_code == 200
    assert response.json()["mykey"] == "new"


def test_get_all_settings(client):
    client.put("/api/v1/settings/test_key", json={"value": "test_val"})
    response = client.get("/api/v1/settings")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "test_key" in data
