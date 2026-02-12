from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.audit_middleware import AuditMiddleware
from app.routers import (
    health,
    dashboard,
    processes,
    monthly_tasks,
    statuses,
    documents,
    emails,
    chat,
    ideas,
    statistics,
    scripts,
    ai_settings,
    settings,
    audit,
    tokens,
    websocket_router,
    subtasks,
)
from app.services.scheduler import init_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    # Startup
    init_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(title="Workflow Manager", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Audit logging middleware - logs all mutating API requests
    app.add_middleware(AuditMiddleware)

    routers = [
        health,
        dashboard,
        processes,
        monthly_tasks,
        statuses,
        documents,
        emails,
        chat,
        ideas,
        statistics,
        scripts,
        ai_settings,
        settings,
        audit,
        tokens,
        subtasks,
    ]

    for module in routers:
        app.include_router(module.router, prefix="/api/v1")

    # WebSocket router without /api/v1 prefix
    app.include_router(websocket_router.router)

    return app


app = create_app()
