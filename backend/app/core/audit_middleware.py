"""Audit logging middleware for FastAPI.

Automatically logs all API requests (except GET requests and excluded paths)
to the audit_log table for compliance and debugging purposes.
"""
import json
import time
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.database import SessionLocal
from app.models.models import AuditLog


# Paths that should not be logged (health checks, static files, etc.)
EXCLUDED_PATHS = {
    "/api/v1/health",
    "/api/v1/audit-log",  # Don't log audit log reads to avoid recursion
    "/docs",
    "/openapi.json",
    "/redoc",
    "/ws",  # WebSocket connections
}

# Only log these HTTP methods (skip GET requests to reduce noise)
LOGGED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _extract_entity_info(path: str, method: str) -> tuple[Optional[str], Optional[int]]:
    """Extract entity type and ID from API path.

    Examples:
        /api/v1/documents/123 -> ("Document", 123)
        /api/v1/emails/456/categorize -> ("Email", 456)
        /api/v1/processes -> ("Process", None)
    """
    # Remove /api/v1/ prefix
    if path.startswith("/api/v1/"):
        path = path[8:]

    parts = path.strip("/").split("/")
    if not parts:
        return None, None

    # Map path segments to entity types
    entity_map = {
        "documents": "Document",
        "emails": "Email",
        "processes": "ProcessType",
        "monthly-tasks": "ProcessInstance",
        "tasks": "ProcessInstance",
        "chat": "ChatConversation",
        "ideas": "Idea",
        "scripts": "PythonScript",
        "statuses": "StatusDefinition",
        "settings": "AppSetting",
        "ai": "AIPersonality",
        "tokens": "TokenUsage",
    }

    entity_type = entity_map.get(parts[0])
    entity_id = None

    # Try to extract ID from second path segment
    if len(parts) > 1:
        try:
            entity_id = int(parts[1])
        except (ValueError, IndexError):
            pass

    return entity_type, entity_id


def _determine_action(method: str, path: str) -> str:
    """Determine the action type based on HTTP method and path."""
    # Check for specific action endpoints
    path_lower = path.lower()

    if "upload" in path_lower:
        return "upload"
    if "export" in path_lower:
        return "export"
    if "import" in path_lower or "pst" in path_lower:
        return "import"
    if "toggle" in path_lower:
        return "toggle"
    if "categorize" in path_lower:
        return "categorize"
    if "generate" in path_lower:
        return "generate"
    if "reorder" in path_lower:
        return "reorder"
    if "reindex" in path_lower:
        return "reindex"
    if "search" in path_lower:
        return "search"
    if "link" in path_lower:
        return "link"

    # Default to HTTP method-based action
    method_actions = {
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete",
    }
    return method_actions.get(method, method.lower())


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware that automatically logs API requests to the audit log."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip excluded paths and non-logged methods
        if request.url.path in EXCLUDED_PATHS:
            return await call_next(request)

        # Check if path starts with any excluded path (for sub-paths)
        for excluded in EXCLUDED_PATHS:
            if request.url.path.startswith(excluded):
                return await call_next(request)

        # Only log mutating methods
        if request.method not in LOGGED_METHODS:
            return await call_next(request)

        # Skip non-API paths
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        # Execute the request
        start_time = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)

        # Only log successful operations (2xx status codes)
        if 200 <= response.status_code < 300:
            # Create audit log entry
            await self._create_audit_entry(
                request=request,
                response=response,
                duration_ms=duration_ms,
            )

        return response

    async def _create_audit_entry(
        self,
        request: Request,
        response: Response,
        duration_ms: int,
    ) -> None:
        """Create an audit log entry for the request."""
        try:
            path = request.url.path
            method = request.method

            entity_type, entity_id = _extract_entity_info(path, method)
            action = _determine_action(method, path)

            # Build details JSON
            details = {
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }

            # Add query params if present
            if request.query_params:
                details["query_params"] = dict(request.query_params)

            # Create database session and log entry
            db = SessionLocal()
            try:
                audit_entry = AuditLog(
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    details=json.dumps(details, ensure_ascii=False),
                )
                db.add(audit_entry)
                db.commit()
            finally:
                db.close()

        except Exception as e:
            # Don't let audit logging failures break the application
            print(f"[AuditMiddleware] Error creating audit log: {e}")
