from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import StatusDefinition, ProcessInstance
from app.schemas.schemas import (
    StatusDefinitionCreate,
    StatusDefinitionUpdate,
    StatusDefinitionResponse,
)

router = APIRouter(prefix="/statuses")


@router.get("", response_model=List[StatusDefinitionResponse])
def list_statuses(db: Session = Depends(get_db)):
    return db.query(StatusDefinition).order_by(StatusDefinition.order).all()


@router.post("", response_model=StatusDefinitionResponse, status_code=201)
def create_status(payload: StatusDefinitionCreate, db: Session = Depends(get_db)):
    status = StatusDefinition(**payload.model_dump())
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


@router.put("/reorder")
def reorder_statuses(order: List[int], db: Session = Depends(get_db)):
    for idx, status_id in enumerate(order):
        status = db.query(StatusDefinition).filter(StatusDefinition.id == status_id).first()
        if status:
            status.order = idx
    db.commit()
    return {"message": "Reordered"}


@router.put("/{status_id}", response_model=StatusDefinitionResponse)
def update_status(status_id: int, payload: StatusDefinitionUpdate, db: Session = Depends(get_db)):
    status = db.query(StatusDefinition).filter(StatusDefinition.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(status, key, value)
    db.commit()
    db.refresh(status)
    return status


@router.delete("/{status_id}")
def delete_status(status_id: int, db: Session = Depends(get_db)):
    status = db.query(StatusDefinition).filter(StatusDefinition.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    in_use = db.query(ProcessInstance).filter(ProcessInstance.status_id == status_id).count()
    if in_use > 0:
        raise HTTPException(status_code=409, detail="Status is in use and cannot be deleted")
    db.delete(status)
    db.commit()
    return {"message": "Deleted"}
