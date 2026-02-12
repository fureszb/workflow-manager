"""Subtasks router for process type templates and instance subtasks."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    ProcessType,
    ProcessTypeSubtask,
    ProcessInstance,
    ProcessInstanceSubtask,
    StatusDefinition,
)
from app.schemas.schemas import (
    ProcessTypeSubtaskCreate,
    ProcessTypeSubtaskUpdate,
    ProcessTypeSubtaskResponse,
    ProcessInstanceSubtaskCreate,
    ProcessInstanceSubtaskUpdate,
    ProcessInstanceSubtaskResponse,
)

router = APIRouter()


# ============================================================
# Process Type Subtask Templates - Reorder MUST come first
# ============================================================

@router.put("/processes/{process_type_id}/subtasks/reorder")
def reorder_process_type_subtasks(
    process_type_id: int,
    subtask_ids: List[int],
    db: Session = Depends(get_db)
):
    """Reorder subtask templates."""
    for idx, subtask_id in enumerate(subtask_ids):
        subtask = db.query(ProcessTypeSubtask).filter(
            ProcessTypeSubtask.id == subtask_id,
            ProcessTypeSubtask.process_type_id == process_type_id
        ).first()
        if subtask:
            subtask.order = idx
    db.commit()
    return {"message": "Sorrend mentve"}


@router.get("/processes/{process_type_id}/subtasks", response_model=List[ProcessTypeSubtaskResponse])
def list_process_type_subtasks(
    process_type_id: int,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    """List all subtask templates for a process type."""
    process_type = db.query(ProcessType).filter(ProcessType.id == process_type_id).first()
    if not process_type:
        raise HTTPException(status_code=404, detail="Process type not found")

    query = db.query(ProcessTypeSubtask).filter(
        ProcessTypeSubtask.process_type_id == process_type_id
    )
    if not include_inactive:
        query = query.filter(ProcessTypeSubtask.is_active == True)

    return query.order_by(ProcessTypeSubtask.order).all()


@router.post("/processes/{process_type_id}/subtasks", response_model=ProcessTypeSubtaskResponse, status_code=201)
def create_process_type_subtask(
    process_type_id: int,
    payload: ProcessTypeSubtaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new subtask template for a process type."""
    process_type = db.query(ProcessType).filter(ProcessType.id == process_type_id).first()
    if not process_type:
        raise HTTPException(status_code=404, detail="Process type not found")

    max_order = db.query(ProcessTypeSubtask).filter(
        ProcessTypeSubtask.process_type_id == process_type_id
    ).count()

    subtask = ProcessTypeSubtask(
        process_type_id=process_type_id,
        name=payload.name,
        description=payload.description,
        order=payload.order if payload.order > 0 else max_order,
        is_active=payload.is_active,
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.put("/processes/{process_type_id}/subtasks/{subtask_id}", response_model=ProcessTypeSubtaskResponse)
def update_process_type_subtask(
    process_type_id: int,
    subtask_id: int,
    payload: ProcessTypeSubtaskUpdate,
    db: Session = Depends(get_db)
):
    """Update a subtask template."""
    subtask = db.query(ProcessTypeSubtask).filter(
        ProcessTypeSubtask.id == subtask_id,
        ProcessTypeSubtask.process_type_id == process_type_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask template not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)

    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/processes/{process_type_id}/subtasks/{subtask_id}")
def delete_process_type_subtask(
    process_type_id: int,
    subtask_id: int,
    db: Session = Depends(get_db)
):
    """Delete a subtask template."""
    subtask = db.query(ProcessTypeSubtask).filter(
        ProcessTypeSubtask.id == subtask_id,
        ProcessTypeSubtask.process_type_id == process_type_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask template not found")

    instance_count = db.query(ProcessInstanceSubtask).filter(
        ProcessInstanceSubtask.template_id == subtask_id
    ).count()

    if instance_count > 0:
        subtask.is_active = False
        db.commit()
        return {"message": "Alfeladat sablon inaktivalva", "deactivated": True}

    db.delete(subtask)
    db.commit()
    return {"message": "Alfeladat sablon torolve", "deleted": True}


# ============================================================
# Process Instance Subtasks - Reorder and generate MUST come first
# ============================================================

@router.put("/monthly-tasks/{task_id}/subtasks/reorder")
def reorder_instance_subtasks(
    task_id: int,
    subtask_ids: List[int],
    db: Session = Depends(get_db)
):
    """Reorder subtasks for a monthly task."""
    for idx, subtask_id in enumerate(subtask_ids):
        subtask = db.query(ProcessInstanceSubtask).filter(
            ProcessInstanceSubtask.id == subtask_id,
            ProcessInstanceSubtask.process_instance_id == task_id
        ).first()
        if subtask:
            subtask.order = idx
    db.commit()
    return {"message": "Sorrend mentve"}


@router.post("/monthly-tasks/{task_id}/subtasks/generate-from-template")
def generate_subtasks_from_template(task_id: int, db: Session = Depends(get_db)):
    """Generate subtasks for a task from its process type's subtask templates."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    templates = db.query(ProcessTypeSubtask).filter(
        ProcessTypeSubtask.process_type_id == task.process_type_id,
        ProcessTypeSubtask.is_active == True
    ).order_by(ProcessTypeSubtask.order).all()

    if not templates:
        return {"message": "Nincs alfeladat sablon ehhez a folyamat tipushoz", "created_count": 0}

    existing_template_ids = {
        s.template_id for s in db.query(ProcessInstanceSubtask).filter(
            ProcessInstanceSubtask.process_instance_id == task_id,
            ProcessInstanceSubtask.template_id.isnot(None)
        ).all()
    }

    default_status = db.query(StatusDefinition).filter(
        StatusDefinition.is_active == True
    ).order_by(StatusDefinition.order).first()

    created_count = 0
    for template in templates:
        if template.id not in existing_template_ids:
            subtask = ProcessInstanceSubtask(
                process_instance_id=task_id,
                template_id=template.id,
                name=template.name,
                description=template.description,
                status_id=default_status.id if default_status else None,
                order=template.order,
            )
            db.add(subtask)
            created_count += 1

    db.commit()
    return {"message": f"{created_count} alfeladat letrehozva a sablonbol", "created_count": created_count}


@router.get("/monthly-tasks/{task_id}/subtasks", response_model=List[ProcessInstanceSubtaskResponse])
def list_instance_subtasks(task_id: int, db: Session = Depends(get_db)):
    """List all subtasks for a monthly task/process instance."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtasks = db.query(ProcessInstanceSubtask).options(
        joinedload(ProcessInstanceSubtask.status)
    ).filter(
        ProcessInstanceSubtask.process_instance_id == task_id
    ).order_by(ProcessInstanceSubtask.order).all()

    return subtasks


@router.post("/monthly-tasks/{task_id}/subtasks", response_model=ProcessInstanceSubtaskResponse, status_code=201)
def create_instance_subtask(
    task_id: int,
    payload: ProcessInstanceSubtaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new subtask for a monthly task."""
    task = db.query(ProcessInstance).filter(ProcessInstance.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    max_order = db.query(ProcessInstanceSubtask).filter(
        ProcessInstanceSubtask.process_instance_id == task_id
    ).count()

    default_status = db.query(StatusDefinition).filter(
        StatusDefinition.is_active == True
    ).order_by(StatusDefinition.order).first()

    subtask = ProcessInstanceSubtask(
        process_instance_id=task_id,
        template_id=payload.template_id,
        name=payload.name,
        description=payload.description,
        status_id=payload.status_id or (default_status.id if default_status else None),
        order=payload.order if payload.order > 0 else max_order,
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)

    return db.query(ProcessInstanceSubtask).options(
        joinedload(ProcessInstanceSubtask.status)
    ).filter(ProcessInstanceSubtask.id == subtask.id).first()


@router.put("/monthly-tasks/{task_id}/subtasks/{subtask_id}", response_model=ProcessInstanceSubtaskResponse)
def update_instance_subtask(
    task_id: int,
    subtask_id: int,
    payload: ProcessInstanceSubtaskUpdate,
    db: Session = Depends(get_db)
):
    """Update a subtask for a monthly task."""
    subtask = db.query(ProcessInstanceSubtask).filter(
        ProcessInstanceSubtask.id == subtask_id,
        ProcessInstanceSubtask.process_instance_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "status_id" in update_data:
        new_status = db.query(StatusDefinition).filter(
            StatusDefinition.id == update_data["status_id"]
        ).first()
        if new_status and new_status.name == "Kesz":
            subtask.completed_at = datetime.utcnow()
        elif subtask.completed_at:
            subtask.completed_at = None

    for field, value in update_data.items():
        setattr(subtask, field, value)

    db.commit()
    db.refresh(subtask)

    return db.query(ProcessInstanceSubtask).options(
        joinedload(ProcessInstanceSubtask.status)
    ).filter(ProcessInstanceSubtask.id == subtask.id).first()


@router.delete("/monthly-tasks/{task_id}/subtasks/{subtask_id}")
def delete_instance_subtask(
    task_id: int,
    subtask_id: int,
    db: Session = Depends(get_db)
):
    """Delete a subtask from a monthly task."""
    subtask = db.query(ProcessInstanceSubtask).filter(
        ProcessInstanceSubtask.id == subtask_id,
        ProcessInstanceSubtask.process_instance_id == task_id
    ).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    db.delete(subtask)
    db.commit()
    return {"message": "Alfeladat torolve"}
