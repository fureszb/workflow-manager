from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import os
import uuid

from app.core.database import get_db
from app.models.models import (
    ProcessInstance,
    ProcessType,
    StatusDefinition,
    AuditLog,
    ProcessComment,
    ProcessFile,
    Document,
    Email,
    EmailTaskLink,
    PythonScript,
    ScriptRun,
)
from app.routers.websocket_router import broadcast_notification
from app.schemas.schemas import (
    ProcessInstanceResponse,
    ProcessInstanceCreate,
    ProcessInstanceUpdate,
    ProcessGenerateRequest,
    ProcessInstanceDetail,
    ProcessCommentCreate,
    ProcessCommentResponse,
    ProcessFileResponse,
    EmailBriefResponse,
    PythonScriptResponse,
    ScriptRunResponse,
    ArchiveYearSummary,
    ArchiveMonthSummary,
    ArchiveSearchResult,
)

router = APIRouter(prefix="/monthly-tasks")


@router.get("", response_model=List[ProcessInstanceResponse])
def list_monthly_tasks(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    status_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List monthly tasks/process instances for a given year and month.

    Optionally filter by status_id.
    """
    query = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
    )

    if year is not None:
        query = query.filter(ProcessInstance.year == year)
    if month is not None:
        query = query.filter(ProcessInstance.month == month)
    if status_id is not None:
        query = query.filter(ProcessInstance.status_id == status_id)

    return query.order_by(ProcessInstance.created_at).all()


@router.get("/{task_id}", response_model=ProcessInstanceDetail)
def get_monthly_task(task_id: int, db: Session = Depends(get_db)):
    """Get a single monthly task by ID with full details (comments, files, linked emails)."""
    task = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
        joinedload(ProcessInstance.comments),
        joinedload(ProcessInstance.files).joinedload(ProcessFile.document),
    ).filter(ProcessInstance.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get linked emails (via EmailTaskLink or direct process_instance_id)
    linked_emails = db.query(Email).filter(
        Email.process_instance_id == task_id
    ).order_by(Email.received_date.desc()).all()

    # Also get emails linked via EmailTaskLink table
    email_task_links = db.query(EmailTaskLink).filter(
        EmailTaskLink.process_instance_id == task_id
    ).all()
    linked_email_ids = {link.email_id for link in email_task_links}

    additional_emails = db.query(Email).filter(
        Email.id.in_(linked_email_ids)
    ).all() if linked_email_ids else []

    # Combine and deduplicate
    all_emails = {e.id: e for e in linked_emails}
    for e in additional_emails:
        all_emails[e.id] = e

    # Build response
    response = ProcessInstanceDetail(
        id=task.id,
        process_type_id=task.process_type_id,
        year=task.year,
        month=task.month,
        status_id=task.status_id,
        notes=task.notes,
        quick_guide=task.quick_guide,
        quick_guide_ai_draft=task.quick_guide_ai_draft,
        started_at=task.started_at,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
        process_type=task.process_type,
        status=task.status,
        comments=sorted(task.comments, key=lambda c: c.created_at),
        files=task.files,
        linked_emails=list(all_emails.values()),
    )
    return response


@router.post("", response_model=ProcessInstanceResponse, status_code=201)
def create_monthly_task(payload: ProcessInstanceCreate, db: Session = Depends(get_db)):
    """Create a new monthly task/process instance."""
    task = ProcessInstance(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)

    # Reload with relationships
    return db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
    ).filter(ProcessInstance.id == task.id).first()


@router.put("/{task_id}", response_model=ProcessInstanceResponse)
def update_monthly_task(
    task_id: int,
    payload: ProcessInstanceUpdate,
    db: Session = Depends(get_db),
):
    """Update a monthly task (status, notes, etc.)."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # Reload with relationships
    return db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
    ).filter(ProcessInstance.id == task.id).first()


@router.delete("/{task_id}")
def delete_monthly_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a monthly task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Deleted"}


@router.post("/generate")
async def generate_monthly_tasks(
    payload: ProcessGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate monthly tasks for all active process types for a given year/month.

    Only creates tasks that don't already exist for the specified month.
    """
    # Get all active process types
    process_types = db.query(ProcessType).filter(ProcessType.is_active == True).all()

    # Get first status as default (if any)
    default_status = db.query(StatusDefinition).filter(
        StatusDefinition.is_active == True
    ).order_by(StatusDefinition.order).first()

    created_count = 0
    for pt in process_types:
        # Check if task already exists for this month
        existing = db.query(ProcessInstance).filter(
            ProcessInstance.process_type_id == pt.id,
            ProcessInstance.year == payload.year,
            ProcessInstance.month == payload.month,
        ).first()

        if not existing:
            task = ProcessInstance(
                process_type_id=pt.id,
                year=payload.year,
                month=payload.month,
                status_id=default_status.id if default_status else None,
            )
            db.add(task)
            created_count += 1

    db.commit()

    # Create audit log entry
    audit_entry = AuditLog(
        action="monthly_tasks_generated",
        entity_type="ProcessInstance",
        details=f"Manuális havi feladat generálás: {created_count} feladat létrehozva ({payload.year}/{payload.month:02d})",
    )
    db.add(audit_entry)
    db.commit()

    # Send notification
    if created_count > 0:
        await broadcast_notification(
            message=f"{created_count} havi feladat létrehozva ({payload.year}/{payload.month:02d})",
            level="success",
            title="Feladat generálás kész",
            action_url="/processes"
        )

    return {"message": f"{created_count} tasks generated", "created_count": created_count}


# ============================================================
# Comments endpoints
# ============================================================

@router.get("/{task_id}/comments", response_model=List[ProcessCommentResponse])
def list_task_comments(task_id: int, db: Session = Depends(get_db)):
    """List all comments for a task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = db.query(ProcessComment).filter(
        ProcessComment.process_instance_id == task_id
    ).order_by(ProcessComment.created_at).all()
    return comments


@router.post("/{task_id}/comments", response_model=ProcessCommentResponse, status_code=201)
def add_task_comment(task_id: int, content: str = Query(...), db: Session = Depends(get_db)):
    """Add a comment to a task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = ProcessComment(
        process_instance_id=task_id,
        content=content,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{task_id}/comments/{comment_id}")
def delete_task_comment(task_id: int, comment_id: int, db: Session = Depends(get_db)):
    """Delete a comment from a task."""
    comment = db.query(ProcessComment).filter(
        ProcessComment.id == comment_id,
        ProcessComment.process_instance_id == task_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    db.delete(comment)
    db.commit()
    return {"message": "Deleted"}


# ============================================================
# File attachment endpoints
# ============================================================

# Configure upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "tasks")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/{task_id}/files", response_model=List[ProcessFileResponse])
def list_task_files(task_id: int, db: Session = Depends(get_db)):
    """List all files attached to a task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    files = db.query(ProcessFile).options(
        joinedload(ProcessFile.document)
    ).filter(ProcessFile.process_instance_id == task_id).all()
    return files


@router.post("/{task_id}/files", response_model=ProcessFileResponse, status_code=201)
async def upload_task_file(task_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a file and attach it to a task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    document = Document(
        filename=unique_filename,
        original_filename=file.filename or "unknown",
        file_path=file_path,
        file_type=file_ext.lstrip(".") if file_ext else None,
        file_size=len(content),
        category="task_attachment",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # Create process_file link
    process_file = ProcessFile(
        process_instance_id=task_id,
        document_id=document.id,
    )
    db.add(process_file)
    db.commit()
    db.refresh(process_file)

    # Reload with document
    return db.query(ProcessFile).options(
        joinedload(ProcessFile.document)
    ).filter(ProcessFile.id == process_file.id).first()


@router.get("/{task_id}/files/{file_id}/download")
def download_task_file(task_id: int, file_id: int, db: Session = Depends(get_db)):
    """Download a file attached to a task."""
    process_file = db.query(ProcessFile).options(
        joinedload(ProcessFile.document)
    ).filter(
        ProcessFile.id == file_id,
        ProcessFile.process_instance_id == task_id,
    ).first()

    if not process_file or not process_file.document:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(process_file.document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=process_file.document.file_path,
        filename=process_file.document.original_filename,
        media_type="application/octet-stream",
    )


@router.delete("/{task_id}/files/{file_id}")
def delete_task_file(task_id: int, file_id: int, db: Session = Depends(get_db)):
    """Delete a file attachment from a task."""
    process_file = db.query(ProcessFile).options(
        joinedload(ProcessFile.document)
    ).filter(
        ProcessFile.id == file_id,
        ProcessFile.process_instance_id == task_id,
    ).first()

    if not process_file:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete physical file if it exists
    if process_file.document and os.path.exists(process_file.document.file_path):
        os.remove(process_file.document.file_path)

    # Delete document record
    if process_file.document:
        db.delete(process_file.document)

    # Delete process_file link
    db.delete(process_file)
    db.commit()
    return {"message": "Deleted"}


# ============================================================
# Linked emails endpoint
# ============================================================

@router.get("/{task_id}/emails", response_model=List[EmailBriefResponse])
def list_task_emails(task_id: int, db: Session = Depends(get_db)):
    """List all emails linked to a task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get emails with direct link
    linked_emails = db.query(Email).filter(
        Email.process_instance_id == task_id
    ).order_by(Email.received_date.desc()).all()

    # Get emails via EmailTaskLink
    email_task_links = db.query(EmailTaskLink).filter(
        EmailTaskLink.process_instance_id == task_id
    ).all()
    linked_email_ids = {link.email_id for link in email_task_links}

    additional_emails = db.query(Email).filter(
        Email.id.in_(linked_email_ids)
    ).all() if linked_email_ids else []

    # Combine and deduplicate
    all_emails = {e.id: e for e in linked_emails}
    for e in additional_emails:
        all_emails[e.id] = e

    return list(all_emails.values())


# ============================================================
# Script execution endpoint
# ============================================================

@router.get("/{task_id}/scripts", response_model=List[PythonScriptResponse])
def list_task_scripts(task_id: int, db: Session = Depends(get_db)):
    """List scripts associated with the task's process type."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    scripts = db.query(PythonScript).filter(
        PythonScript.process_type_id == task.process_type_id
    ).all()
    return scripts


@router.post("/{task_id}/scripts/{script_id}/run", response_model=ScriptRunResponse, status_code=201)
def run_task_script(task_id: int, script_id: int, db: Session = Depends(get_db)):
    """Start a script run for a task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    script = db.query(PythonScript).filter(
        PythonScript.id == script_id,
        PythonScript.process_type_id == task.process_type_id,
    ).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found or not associated with this process type")

    # Create a script run record (actual execution would be handled asynchronously)
    script_run = ScriptRun(
        script_id=script_id,
        status="pending",
    )
    db.add(script_run)
    db.commit()
    db.refresh(script_run)

    # Note: Actual script execution should be handled by a background task worker
    # For now, we just create the run record

    return script_run


# ============================================================
# Archive endpoints
# ============================================================

MONTH_NAMES_HU = [
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December"
]


@router.get("/archive/years", response_model=List[ArchiveYearSummary])
def list_archive_years(db: Session = Depends(get_db)):
    """List all years that have process instances with monthly summaries."""
    from sqlalchemy import func, distinct

    # Get all distinct years
    years_query = db.query(
        distinct(ProcessInstance.year)
    ).order_by(ProcessInstance.year.desc()).all()

    years = [y[0] for y in years_query]

    # Get completed status name to identify completed tasks
    completed_status = db.query(StatusDefinition).filter(
        StatusDefinition.name == "Kész"
    ).first()
    completed_status_id = completed_status.id if completed_status else None

    result = []
    for year in years:
        # Get all months for this year
        months_data = db.query(
            ProcessInstance.month,
            func.count(ProcessInstance.id).label("task_count"),
        ).filter(
            ProcessInstance.year == year
        ).group_by(ProcessInstance.month).order_by(ProcessInstance.month).all()

        months = []
        total_tasks = 0
        total_completed = 0

        for month, task_count in months_data:
            # Count completed tasks for this month
            completed_count = 0
            if completed_status_id:
                completed_count = db.query(func.count(ProcessInstance.id)).filter(
                    ProcessInstance.year == year,
                    ProcessInstance.month == month,
                    ProcessInstance.status_id == completed_status_id
                ).scalar() or 0

            months.append(ArchiveMonthSummary(
                month=month,
                month_name=MONTH_NAMES_HU[month - 1],
                task_count=task_count,
                completed_count=completed_count
            ))
            total_tasks += task_count
            total_completed += completed_count

        result.append(ArchiveYearSummary(
            year=year,
            months=months,
            total_tasks=total_tasks,
            total_completed=total_completed
        ))

    return result


@router.get("/archive/years/{year}", response_model=ArchiveYearSummary)
def get_archive_year(year: int, db: Session = Depends(get_db)):
    """Get archive data for a specific year."""
    from sqlalchemy import func

    # Check if year has any data
    year_count = db.query(func.count(ProcessInstance.id)).filter(
        ProcessInstance.year == year
    ).scalar()

    if not year_count:
        raise HTTPException(status_code=404, detail="No data for this year")

    # Get completed status
    completed_status = db.query(StatusDefinition).filter(
        StatusDefinition.name == "Kész"
    ).first()
    completed_status_id = completed_status.id if completed_status else None

    # Get all months for this year
    months_data = db.query(
        ProcessInstance.month,
        func.count(ProcessInstance.id).label("task_count"),
    ).filter(
        ProcessInstance.year == year
    ).group_by(ProcessInstance.month).order_by(ProcessInstance.month).all()

    months = []
    total_tasks = 0
    total_completed = 0

    for month, task_count in months_data:
        completed_count = 0
        if completed_status_id:
            completed_count = db.query(func.count(ProcessInstance.id)).filter(
                ProcessInstance.year == year,
                ProcessInstance.month == month,
                ProcessInstance.status_id == completed_status_id
            ).scalar() or 0

        months.append(ArchiveMonthSummary(
            month=month,
            month_name=MONTH_NAMES_HU[month - 1],
            task_count=task_count,
            completed_count=completed_count
        ))
        total_tasks += task_count
        total_completed += completed_count

    return ArchiveYearSummary(
        year=year,
        months=months,
        total_tasks=total_tasks,
        total_completed=total_completed
    )


@router.get("/archive/years/{year}/months/{month}", response_model=List[ProcessInstanceResponse])
def get_archive_month_tasks(year: int, month: int, db: Session = Depends(get_db)):
    """Get all process instances for a specific year/month."""
    tasks = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
    ).filter(
        ProcessInstance.year == year,
        ProcessInstance.month == month
    ).order_by(ProcessInstance.created_at).all()

    return tasks


@router.get("/archive/search", response_model=List[ArchiveSearchResult])
def search_archive(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db)
):
    """Search archive for process instances by process type name or notes."""
    search_term = f"%{q}%"

    tasks = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.status),
    ).join(ProcessType).filter(
        (ProcessType.name.ilike(search_term)) |
        (ProcessInstance.notes.ilike(search_term))
    ).order_by(
        ProcessInstance.year.desc(),
        ProcessInstance.month.desc()
    ).limit(50).all()

    results = []
    for task in tasks:
        results.append(ArchiveSearchResult(
            id=task.id,
            year=task.year,
            month=task.month,
            process_type_name=task.process_type.name if task.process_type else "Ismeretlen",
            status_name=task.status.name if task.status else None,
            status_color=task.status.color if task.status else None,
            notes=task.notes
        ))

    return results
