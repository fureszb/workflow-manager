"""WebSocket infrastructure for real-time features.

Event types:
- script.output: Real-time script output streaming
- script.status: Script execution status changes (running, completed, failed)
- chat.stream: Chat message streaming tokens
- notification: General notifications (info, success, warning, error)
- pst_import.progress: PST email import progress updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set
import json
import asyncio
from datetime import datetime


router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections with proper lifecycle handling."""

    def __init__(self):
        self._active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self._active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            self._active_connections.discard(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific client."""
        try:
            await websocket.send_json(message)
        except Exception:
            await self.disconnect(websocket)

    async def broadcast(self, event_type: str, data: dict):
        """Broadcast a message to all connected clients."""
        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        async with self._lock:
            connections = list(self._active_connections)

        # Send to all connections, removing failed ones
        disconnected = []
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        if disconnected:
            async with self._lock:
                for conn in disconnected:
                    self._active_connections.discard(conn)

    @property
    def connection_count(self) -> int:
        """Return the number of active connections."""
        return len(self._active_connections)


# Global connection manager instance
manager = ConnectionManager()


# Backward-compatible broadcast function
async def broadcast(event_type: str, data: dict):
    """Broadcast a message to all connected clients.

    This function provides backward compatibility with existing code.
    """
    await manager.broadcast(event_type, data)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time communication."""
    await manager.connect(websocket)
    try:
        while True:
            # Receive and process incoming messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                message_type = message.get("type", "")

                # Handle ping/pong for connection keep-alive
                if message_type == "ping":
                    await manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
                        websocket
                    )
                # Handle subscription requests (for future use)
                elif message_type == "subscribe":
                    channel = message.get("channel", "")
                    await manager.send_personal_message(
                        {"type": "subscribed", "channel": channel},
                        websocket
                    )
            except json.JSONDecodeError:
                # Ignore invalid JSON
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


# Helper functions for broadcasting from other modules
async def broadcast_script_output(script_id: int, output: str, is_error: bool = False):
    """Broadcast script output to all connected clients."""
    await manager.broadcast("script.output", {
        "script_id": script_id,
        "output": output,
        "is_error": is_error
    })


async def broadcast_script_status(script_id: int, status: str, exit_code: int | None = None):
    """Broadcast script status change to all connected clients."""
    await manager.broadcast("script.status", {
        "script_id": script_id,
        "status": status,
        "exit_code": exit_code
    })


async def broadcast_chat_stream(conversation_id: int, token: str, is_done: bool = False):
    """Broadcast chat streaming token to all connected clients."""
    await manager.broadcast("chat.stream", {
        "conversation_id": conversation_id,
        "token": token,
        "done": is_done
    })


async def broadcast_notification(
    message: str,
    level: str = "info",
    title: str | None = None,
    action_url: str | None = None
):
    """Broadcast a notification to all connected clients.

    Args:
        message: The notification message
        level: One of 'info', 'success', 'warning', 'error'
        title: Optional notification title
        action_url: Optional URL to navigate to on click
    """
    await manager.broadcast("notification", {
        "message": message,
        "level": level,
        "title": title,
        "action_url": action_url
    })


async def broadcast_pst_import_progress(
    import_id: str,
    progress: int,
    total: int,
    current_item: str | None = None,
    status: str = "in_progress"
):
    """Broadcast PST import progress to all connected clients."""
    await manager.broadcast("pst_import.progress", {
        "import_id": import_id,
        "progress": progress,
        "total": total,
        "current_item": current_item,
        "status": status,
        "percentage": round((progress / total * 100) if total > 0 else 0, 1)
    })
