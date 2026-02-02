def test_list_statuses_empty(client):
    response = client.get("/api/v1/statuses")
    assert response.status_code == 200
    assert response.json() == []


def test_create_status(client):
    response = client.post("/api/v1/statuses", json={
        "name": "Tervezés",
        "order": 0,
        "color": "#6b7280",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tervezés"
    assert data["color"] == "#6b7280"
    assert data["order"] == 0
    assert "id" in data


def test_list_statuses_ordered(client):
    client.post("/api/v1/statuses", json={"name": "B", "order": 2, "color": "#000000"})
    client.post("/api/v1/statuses", json={"name": "A", "order": 1, "color": "#111111"})
    response = client.get("/api/v1/statuses")
    data = response.json()
    assert len(data) >= 2
    orders = [s["order"] for s in data]
    assert orders == sorted(orders)


def test_update_status(client):
    create = client.post("/api/v1/statuses", json={"name": "Draft", "order": 0, "color": "#aaa"})
    sid = create.json()["id"]
    response = client.put(f"/api/v1/statuses/{sid}", json={"name": "Updated", "color": "#bbb"})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"
    assert response.json()["color"] == "#bbb"


def test_update_status_not_found(client):
    response = client.put("/api/v1/statuses/99999", json={"name": "X"})
    assert response.status_code == 404


def test_delete_status(client):
    create = client.post("/api/v1/statuses", json={"name": "ToDelete", "order": 0, "color": "#ccc"})
    sid = create.json()["id"]
    response = client.delete(f"/api/v1/statuses/{sid}")
    assert response.status_code == 200


def test_delete_status_not_found(client):
    response = client.delete("/api/v1/statuses/99999")
    assert response.status_code == 404


def test_reorder_statuses(client):
    r1 = client.post("/api/v1/statuses", json={"name": "First", "order": 0, "color": "#111"})
    r2 = client.post("/api/v1/statuses", json={"name": "Second", "order": 1, "color": "#222"})
    id1 = r1.json()["id"]
    id2 = r2.json()["id"]
    response = client.put("/api/v1/statuses/reorder", json=[id2, id1])
    assert response.status_code == 200
    statuses = client.get("/api/v1/statuses").json()
    id_order = {s["id"]: s["order"] for s in statuses}
    assert id_order[id2] < id_order[id1]
