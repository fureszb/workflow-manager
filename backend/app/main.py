from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
)


def create_app() -> FastAPI:
    app = FastAPI(title="Workflow Manager", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
    ]

    for module in routers:
        app.include_router(module.router, prefix="/api/v1")

    return app


app = create_app()
