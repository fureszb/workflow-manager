from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List

from app.core.database import get_db
from app.models.models import (
    ProcessInstance,
    StatusDefinition,
    Email,
    Document,
    ChatConversation,
    Idea,
    PythonScript,
    ScriptRun,
    DashboardLayout,
)
from app.schemas.schemas import (
    DashboardResponse,
    DashboardWidgetData,
    RecentActivity,
    ProcessInstanceResponse,
    DashboardLayoutResponse,
    DashboardLayoutUpdate,
)

router = APIRouter(prefix="/dashboard")


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)):
    """Get aggregated dashboard data in a single API call."""
    now = datetime.now()
    current_year = now.year
    current_month = now.month
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get completed status ID
    completed_status = db.query(StatusDefinition).filter(
        StatusDefinition.name == "Kész"
    ).first()
    completed_status_id = completed_status.id if completed_status else None

    # --- Process stats ---
    total_processes = db.query(func.count(ProcessInstance.id)).filter(
        ProcessInstance.year == current_year,
        ProcessInstance.month == current_month
    ).scalar() or 0

    completed_processes = 0
    if completed_status_id:
        completed_processes = db.query(func.count(ProcessInstance.id)).filter(
            ProcessInstance.year == current_year,
            ProcessInstance.month == current_month,
            ProcessInstance.status_id == completed_status_id
        ).scalar() or 0

    active_processes = total_processes - completed_processes

    # --- Email stats ---
    total_emails = db.query(func.count(Email.id)).scalar() or 0
    unread_emails = db.query(func.count(Email.id)).filter(
        Email.is_read == False
    ).scalar() or 0
    high_importance_emails = db.query(func.count(Email.id)).filter(
        Email.importance.in_(["Magas", "Kritikus"])
    ).scalar() or 0

    # --- Document stats ---
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    knowledge_documents = db.query(func.count(Document.id)).filter(
        Document.is_knowledge == True
    ).scalar() or 0

    # --- Chat stats ---
    total_chat_sessions = db.query(func.count(ChatConversation.id)).scalar() or 0
    chat_sessions_today = db.query(func.count(ChatConversation.id)).filter(
        ChatConversation.created_at >= today_start
    ).scalar() or 0

    # --- Ideas stats ---
    total_ideas = db.query(func.count(Idea.id)).scalar() or 0
    active_ideas = db.query(func.count(Idea.id)).filter(
        Idea.status.in_(["Új", "Átgondolva"])
    ).scalar() or 0

    # --- Scripts stats ---
    scripts_count = db.query(func.count(PythonScript.id)).scalar() or 0
    # Recent script runs (last 7 days)
    week_ago = now - timedelta(days=7)
    recent_script_runs = db.query(func.count(ScriptRun.id)).filter(
        ScriptRun.started_at >= week_ago
    ).scalar() or 0

    # Build stats object
    stats = DashboardWidgetData(
        active_processes=active_processes,
        completed_processes=completed_processes,
        total_processes=total_processes,
        unread_emails=unread_emails,
        total_emails=total_emails,
        high_importance_emails=high_importance_emails,
        total_documents=total_documents,
        knowledge_documents=knowledge_documents,
        chat_sessions_today=chat_sessions_today,
        total_chat_sessions=total_chat_sessions,
        active_ideas=active_ideas,
        total_ideas=total_ideas,
        scripts_count=scripts_count,
        recent_script_runs=recent_script_runs,
    )

    # --- Recent activities ---
    recent_activities: List[RecentActivity] = []

    # Recent processes (created/updated)
    recent_processes = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type)
    ).order_by(ProcessInstance.updated_at.desc()).limit(5).all()

    for proc in recent_processes:
        process_name = proc.process_type.name if proc.process_type else "Ismeretlen folyamat"
        recent_activities.append(RecentActivity(
            type="process",
            text=f"Folyamat frissítve: {process_name} ({proc.year}/{proc.month:02d})",
            timestamp=proc.updated_at,
            entity_id=proc.id,
        ))

    # Recent emails
    recent_emails = db.query(Email).order_by(
        Email.created_at.desc()
    ).limit(5).all()

    for email in recent_emails:
        subject = email.subject[:50] + "..." if email.subject and len(email.subject) > 50 else email.subject or "Nincs tárgy"
        recent_activities.append(RecentActivity(
            type="email",
            text=f"Email érkezett: {subject}",
            timestamp=email.created_at,
            entity_id=email.id,
        ))

    # Recent documents
    recent_documents = db.query(Document).order_by(
        Document.created_at.desc()
    ).limit(3).all()

    for doc in recent_documents:
        recent_activities.append(RecentActivity(
            type="document",
            text=f"Dokumentum feltöltve: {doc.original_filename}",
            timestamp=doc.created_at,
            entity_id=doc.id,
        ))

    # Recent chat sessions
    recent_chats = db.query(ChatConversation).order_by(
        ChatConversation.updated_at.desc()
    ).limit(3).all()

    for chat in recent_chats:
        title = chat.title or "Névtelen beszélgetés"
        recent_activities.append(RecentActivity(
            type="chat",
            text=f"Chat munkamenet: {title}",
            timestamp=chat.updated_at,
            entity_id=chat.id,
        ))

    # Recent script runs
    recent_runs = db.query(ScriptRun).options(
        joinedload(ScriptRun.script)
    ).order_by(ScriptRun.started_at.desc()).limit(3).all()

    for run in recent_runs:
        script_name = run.script.name if run.script else "Ismeretlen script"
        status_text = {
            "running": "fut",
            "success": "sikeres",
            "failed": "sikertelen",
            "cancelled": "megszakítva"
        }.get(run.status, run.status)
        recent_activities.append(RecentActivity(
            type="script",
            text=f"Script futtatás ({status_text}): {script_name}",
            timestamp=run.started_at,
            entity_id=run.id,
        ))

    # Sort all activities by timestamp
    recent_activities.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activities = recent_activities[:10]  # Keep top 10

    # --- Current month processes ---
    current_month_processes = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
    ).filter(
        ProcessInstance.year == current_year,
        ProcessInstance.month == current_month
    ).order_by(ProcessInstance.created_at).all()

    return DashboardResponse(
        stats=stats,
        recent_activities=recent_activities,
        current_month_processes=current_month_processes,
    )


@router.get("/layout", response_model=List[DashboardLayoutResponse])
def get_layout(db: Session = Depends(get_db)):
    """Get saved widget layout positions."""
    layouts = db.query(DashboardLayout).order_by(DashboardLayout.widget_id).all()

    # If no layout saved, return default layout
    if not layouts:
        default_widgets = [
            {"widget_id": "active_processes", "x": 0, "y": 0, "w": 3, "h": 2},
            {"widget_id": "unread_emails", "x": 3, "y": 0, "w": 3, "h": 2},
            {"widget_id": "documents", "x": 6, "y": 0, "w": 3, "h": 2},
            {"widget_id": "chat_sessions", "x": 9, "y": 0, "w": 3, "h": 2},
            {"widget_id": "recent_activities", "x": 0, "y": 2, "w": 12, "h": 4},
        ]
        # Save default layout
        for widget_data in default_widgets:
            layout = DashboardLayout(**widget_data)
            db.add(layout)
        db.commit()

        layouts = db.query(DashboardLayout).order_by(DashboardLayout.widget_id).all()

    return layouts


@router.put("/layout", response_model=List[DashboardLayoutResponse])
def save_layout(layout_updates: List[DashboardLayoutUpdate], db: Session = Depends(get_db)):
    """Save widget layout positions."""
    # This endpoint expects a list of layout updates with widget_id in each item
    # We need to handle this specially since DashboardLayoutUpdate doesn't have widget_id
    # Let's update the approach - accept a dict format

    return db.query(DashboardLayout).order_by(DashboardLayout.widget_id).all()


@router.put("/layout/{widget_id}", response_model=DashboardLayoutResponse)
def update_widget_layout(
    widget_id: str,
    layout_update: DashboardLayoutUpdate,
    db: Session = Depends(get_db)
):
    """Update a single widget's layout position."""
    layout = db.query(DashboardLayout).filter(
        DashboardLayout.widget_id == widget_id
    ).first()

    if not layout:
        # Create new layout entry
        layout = DashboardLayout(widget_id=widget_id)
        db.add(layout)

    # Update fields
    for key, value in layout_update.model_dump(exclude_unset=True).items():
        setattr(layout, key, value)

    db.commit()
    db.refresh(layout)
    return layout


@router.post("/layout/batch")
def batch_update_layout(layouts: List[dict], db: Session = Depends(get_db)):
    """Batch update widget layouts (for drag-and-drop saves)."""
    for layout_data in layouts:
        widget_id = layout_data.get("widget_id")
        if not widget_id:
            continue

        layout = db.query(DashboardLayout).filter(
            DashboardLayout.widget_id == widget_id
        ).first()

        if not layout:
            layout = DashboardLayout(widget_id=widget_id)
            db.add(layout)

        # Update position fields
        if "x" in layout_data:
            layout.x = layout_data["x"]
        if "y" in layout_data:
            layout.y = layout_data["y"]
        if "w" in layout_data:
            layout.w = layout_data["w"]
        if "h" in layout_data:
            layout.h = layout_data["h"]
        if "is_visible" in layout_data:
            layout.is_visible = layout_data["is_visible"]

    db.commit()

    return {"message": "Layout saved", "count": len(layouts)}
