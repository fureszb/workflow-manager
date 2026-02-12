from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.core.database import get_db
from app.models.models import ProcessType, ProcessInstance, ProcessFile
from app.schemas.schemas import ProcessTypeResponse, GenerateGuideResponse
from app.services.ai_service import generate_quick_guide, extract_text_from_file

router = APIRouter(prefix="/processes")


@router.get("", response_model=List[ProcessTypeResponse])
def list_processes(db: Session = Depends(get_db)):
    """List all process types ordered by their order field."""
    return db.query(ProcessType).filter(ProcessType.is_active == True).order_by(ProcessType.order).all()


@router.get("/{process_id}", response_model=ProcessTypeResponse)
def get_process(process_id: int, db: Session = Depends(get_db)):
    """Get a single process type by ID."""
    process = db.query(ProcessType).filter(ProcessType.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    return process


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
