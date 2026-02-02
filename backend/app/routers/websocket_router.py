from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

router = APIRouter()

connected_clients = []

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Handle incoming messages
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

async def broadcast(event_type: str, data: dict):
    message = json.dumps({"type": event_type, "data": data})
    for client in connected_clients:
        try:
            await client.send_text(message)
        except:
            connected_clients.remove(client)
