from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.core.database import get_db
from app.models.models import ProcessType, ProcessInstance, ProcessFile
from app.schemas.schemas import ProcessTypeResponse, ProcessTypeCreate, ProcessTypeUpdate, GenerateGuideResponse
from app.services.ai_service import generate_quick_guide, extract_text_from_file

router = APIRouter(prefix="/processes")


@router.get("", response_model=List[ProcessTypeResponse])
def list_processes(
    include_inactive: bool = Query(False, description="Include inactive process types"),
    db: Session = Depends(get_db)
):
    """List all process types ordered by their order field."""
    query = db.query(ProcessType)
    if not include_inactive:
        query = query.filter(ProcessType.is_active == True)
    return query.order_by(ProcessType.order).all()


@router.put("/reorder", response_model=List[ProcessTypeResponse])
def reorder_processes(process_ids: List[int], db: Session = Depends(get_db)):
    """Reorder process types based on the provided list of IDs."""
    for idx, process_id in enumerate(process_ids):
        process = db.query(ProcessType).filter(ProcessType.id == process_id).first()
        if process:
            process.order = idx
    
    db.commit()
    return db.query(ProcessType).filter(ProcessType.is_active == True).order_by(ProcessType.order).all()


@router.get("/{process_id}", response_model=ProcessTypeResponse)
def get_process(process_id: int, db: Session = Depends(get_db)):
    """Get a single process type by ID."""
    process = db.query(ProcessType).filter(ProcessType.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    return process


@router.post("", response_model=ProcessTypeResponse, status_code=201)
def create_process(payload: ProcessTypeCreate, db: Session = Depends(get_db)):
    """Create a new process type."""
    # Get max order to add new process at the end
    max_order = db.query(ProcessType).count()
    
    process = ProcessType(
        name=payload.name,
        description=payload.description,
        quick_guide=payload.quick_guide,
        order=payload.order if payload.order > 0 else max_order,
        is_active=payload.is_active,
    )
    db.add(process)
    db.commit()
    db.refresh(process)
    return process


@router.put("/{process_id}", response_model=ProcessTypeResponse)
def update_process(process_id: int, payload: ProcessTypeUpdate, db: Session = Depends(get_db)):
    """Update a process type."""
    process = db.query(ProcessType).filter(ProcessType.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(process, field, value)
    
    db.commit()
    db.refresh(process)
    return process


@router.delete("/{process_id}")
def delete_process(process_id: int, db: Session = Depends(get_db)):
    """Delete or deactivate a process type.
    
    If the process type has instances, it will be deactivated instead of deleted.
    """
    process = db.query(ProcessType).filter(ProcessType.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    
    # Check if there are any instances using this process type
    instances_count = db.query(ProcessInstance).filter(
        ProcessInstance.process_type_id == process_id
    ).count()
    
    if instances_count > 0:
        # Deactivate instead of delete
        process.is_active = False
        db.commit()
        return {"message": "A folyamat típus inaktiválva (van hozzá tartozó feladat)", "deactivated": True}
    
    db.delete(process)
    db.commit()
    return {"message": "Folyamat típus törölve", "deleted": True}


@router.post("/{task_id}/generate-guide", response_model=GenerateGuideResponse)
async def generate_guide(task_id: int, db: Session = Depends(get_db)):
    """Generate an AI-powered quick guide draft for a task.

    Reads the uploaded process description documents and generates a summary.
    The result is stored in the quick_guide_ai_draft field.
    """
    # Get the task with its files
    task = db.query(ProcessInstance).options(
        joinedload(ProcessInstance.process_type),
        joinedload(ProcessInstance.files).joinedload(ProcessFile.document),
    ).filter(ProcessInstance.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Feladat nem található")

    if not task.process_type:
        raise HTTPException(status_code=400, detail="A feladatnak nincs folyamat típusa")

    # Extract text from all attached files
    document_contents = []

    # Check files attached to this task
    if task.files:
        for file_link in task.files:
            if file_link.document:
                doc = file_link.document
                content = extract_text_from_file(doc.file_path, doc.file_type)
                if content and not content.startswith("["):
                    document_contents.append(f"--- {doc.original_filename} ---\n{content}")

    # If no files attached, use process type description as fallback
    if not document_contents:
        if task.process_type.description:
            document_contents.append(task.process_type.description)
        if task.process_type.quick_guide:
            document_contents.append(f"Meglévő útmutató:\n{task.process_type.quick_guide}")

    if not document_contents:
        raise HTTPException(
            status_code=400,
            detail="Nincsenek feltöltött dokumentumok vagy folyamatleírás. Töltsön fel dokumentumokat a feladathoz."
        )

    combined_content = "\n\n".join(document_contents)

    # Limit content to prevent token overflow
    if len(combined_content) > 15000:
        combined_content = combined_content[:15000] + "\n...[tartalom rövidítve]"

    try:
        # Generate the guide using AI
        generated_guide = await generate_quick_guide(
            document_content=combined_content,
            process_name=task.process_type.name,
            db=db,
        )

        # Save the draft to the task
        task.quick_guide_ai_draft = generated_guide
        db.commit()

        return GenerateGuideResponse(
            task_id=task.id,
            quick_guide_ai_draft=generated_guide,
            message="Gyors útmutató sikeresen generálva!"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hiba az AI generálás során: {str(e)}"
        )
