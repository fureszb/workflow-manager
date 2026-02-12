"""Ideas & Improvements router for workflow enhancement suggestions."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.models import Idea, ProcessType, Document, Email
from app.schemas.schemas import (
    IdeaCreate,
    IdeaUpdate,
    IdeaResponse,
    ProcessTypeResponse,
)
from app.services.ai_service import send_chat_message
from app.routers.websocket_router import broadcast_notification

router = APIRouter(prefix="/ideas")


@router.get("", response_model=List[IdeaResponse])
def list_ideas(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status: Új, Átgondolva, Megvalósítva, Elvetve"),
    priority: Optional[str] = Query(None, description="Filter by priority: Alacsony, Közepes, Magas, Kritikus"),
    source: Optional[str] = Query(None, description="Filter by source: manual, ai"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: Session = Depends(get_db)
):
    """List all ideas with optional filtering.

    Supports filtering by:
    - status: Új, Átgondolva, Megvalósítva, Elvetve
    - priority: Alacsony, Közepes, Magas, Kritikus
    - source: manual, ai
    - search: text search in title and description
    """
    query = db.query(Idea)

    # Status filter
    if status:
        query = query.filter(Idea.status == status)

    # Priority filter
    if priority:
        query = query.filter(Idea.priority == priority)

    # Source filter
    if source:
        query = query.filter(Idea.source == source)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Idea.title.ilike(search_term),
                Idea.description.ilike(search_term)
            )
        )

    ideas = query.order_by(Idea.created_at.desc()).offset(skip).limit(limit).all()

    # Load process_type relationship for each idea
    result = []
    for idea in ideas:
        idea_dict = {
            "id": idea.id,
            "title": idea.title,
            "description": idea.description,
            "source": idea.source,
            "status": idea.status,
            "priority": idea.priority,
            "process_type_id": idea.process_type_id,
            "created_at": idea.created_at,
            "updated_at": idea.updated_at,
            "process_type": None,
        }
        if idea.process_type:
            idea_dict["process_type"] = ProcessTypeResponse(
                id=idea.process_type.id,
                name=idea.process_type.name,
                description=idea.process_type.description,
                quick_guide=idea.process_type.quick_guide,
                order=idea.process_type.order,
                is_active=idea.process_type.is_active,
                created_at=idea.process_type.created_at,
            )
        result.append(IdeaResponse(**idea_dict))

    return result


@router.get("/{idea_id}", response_model=IdeaResponse)
def get_idea(idea_id: int, db: Session = Depends(get_db)):
    """Get a single idea by ID."""
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    idea_dict = {
        "id": idea.id,
        "title": idea.title,
        "description": idea.description,
        "source": idea.source,
        "status": idea.status,
        "priority": idea.priority,
        "process_type_id": idea.process_type_id,
        "created_at": idea.created_at,
        "updated_at": idea.updated_at,
        "process_type": None,
    }
    if idea.process_type:
        idea_dict["process_type"] = ProcessTypeResponse(
            id=idea.process_type.id,
            name=idea.process_type.name,
            description=idea.process_type.description,
            quick_guide=idea.process_type.quick_guide,
            order=idea.process_type.order,
            is_active=idea.process_type.is_active,
            created_at=idea.process_type.created_at,
        )

    return IdeaResponse(**idea_dict)


@router.post("", response_model=IdeaResponse)
def create_idea(idea: IdeaCreate, db: Session = Depends(get_db)):
    """Create a new manual idea.

    Required fields:
    - title: The idea title

    Optional fields:
    - description: Detailed description
    - priority: Alacsony, Közepes, Magas, Kritikus (default: Közepes)
    - process_type_id: Related process type ID
    """
    # Validate priority
    valid_priorities = ["Alacsony", "Közepes", "Magas", "Kritikus"]
    if idea.priority and idea.priority not in valid_priorities:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid priority. Valid values: {', '.join(valid_priorities)}"
        )

    # Validate status
    valid_statuses = ["Új", "Átgondolva", "Megvalósítva", "Elvetve"]
    if idea.status and idea.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Valid values: {', '.join(valid_statuses)}"
        )

    # Validate process_type_id if provided
    if idea.process_type_id:
        process_type = db.query(ProcessType).filter(ProcessType.id == idea.process_type_id).first()
        if not process_type:
            raise HTTPException(status_code=404, detail="Process type not found")

    db_idea = Idea(
        title=idea.title,
        description=idea.description,
        source=idea.source or "manual",
        status=idea.status or "Új",
        priority=idea.priority or "Közepes",
        process_type_id=idea.process_type_id,
    )
    db.add(db_idea)
    db.commit()
    db.refresh(db_idea)

    # Build response with process_type
    idea_dict = {
        "id": db_idea.id,
        "title": db_idea.title,
        "description": db_idea.description,
        "source": db_idea.source,
        "status": db_idea.status,
        "priority": db_idea.priority,
        "process_type_id": db_idea.process_type_id,
        "created_at": db_idea.created_at,
        "updated_at": db_idea.updated_at,
        "process_type": None,
    }
    if db_idea.process_type:
        idea_dict["process_type"] = ProcessTypeResponse(
            id=db_idea.process_type.id,
            name=db_idea.process_type.name,
            description=db_idea.process_type.description,
            quick_guide=db_idea.process_type.quick_guide,
            order=db_idea.process_type.order,
            is_active=db_idea.process_type.is_active,
            created_at=db_idea.process_type.created_at,
        )

    return IdeaResponse(**idea_dict)


@router.put("/{idea_id}", response_model=IdeaResponse)
def update_idea(idea_id: int, idea_update: IdeaUpdate, db: Session = Depends(get_db)):
    """Update an existing idea.

    All fields are optional. Commonly used to update:
    - status: Új → Átgondolva → Megvalósítva / Elvetve
    - priority: Alacsony, Közepes, Magas, Kritikus
    """
    db_idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not db_idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Validate priority if provided
    if idea_update.priority:
        valid_priorities = ["Alacsony", "Közepes", "Magas", "Kritikus"]
        if idea_update.priority not in valid_priorities:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid priority. Valid values: {', '.join(valid_priorities)}"
            )

    # Validate status if provided
    if idea_update.status:
        valid_statuses = ["Új", "Átgondolva", "Megvalósítva", "Elvetve"]
        if idea_update.status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Valid values: {', '.join(valid_statuses)}"
            )

    # Validate process_type_id if provided
    if idea_update.process_type_id:
        process_type = db.query(ProcessType).filter(ProcessType.id == idea_update.process_type_id).first()
        if not process_type:
            raise HTTPException(status_code=404, detail="Process type not found")

    # Update fields
    update_data = idea_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_idea, field, value)

    db.commit()
    db.refresh(db_idea)

    # Build response
    idea_dict = {
        "id": db_idea.id,
        "title": db_idea.title,
        "description": db_idea.description,
        "source": db_idea.source,
        "status": db_idea.status,
        "priority": db_idea.priority,
        "process_type_id": db_idea.process_type_id,
        "created_at": db_idea.created_at,
        "updated_at": db_idea.updated_at,
        "process_type": None,
    }
    if db_idea.process_type:
        idea_dict["process_type"] = ProcessTypeResponse(
            id=db_idea.process_type.id,
            name=db_idea.process_type.name,
            description=db_idea.process_type.description,
            quick_guide=db_idea.process_type.quick_guide,
            order=db_idea.process_type.order,
            is_active=db_idea.process_type.is_active,
            created_at=db_idea.process_type.created_at,
        )

    return IdeaResponse(**idea_dict)


@router.delete("/{idea_id}")
def delete_idea(idea_id: int, db: Session = Depends(get_db)):
    """Delete an idea by ID."""
    db_idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not db_idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    db.delete(db_idea)
    db.commit()

    return {"message": "Idea deleted successfully"}


# Response model for AI generation
from pydantic import BaseModel
from typing import List as TypingList


class AIGeneratedIdea(BaseModel):
    title: str
    description: str
    priority: str
    suggested_process_type: Optional[str] = None


class IdeaGenerateResponse(BaseModel):
    success: bool
    generated_count: int
    ideas: TypingList[IdeaResponse]
    message: str


@router.post("/generate", response_model=IdeaGenerateResponse)
async def generate_ideas(
    analyze_documents: bool = Query(True, description="Analyze recent documents for ideas"),
    analyze_emails: bool = Query(True, description="Analyze recent emails for ideas"),
    max_ideas: int = Query(5, description="Maximum number of ideas to generate", ge=1, le=10),
    db: Session = Depends(get_db)
):
    """Generate workflow improvement ideas using AI.

    The AI analyzes:
    - Recent documents (if analyze_documents=True)
    - Recent emails (if analyze_emails=True)

    And generates improvement suggestions based on patterns, inefficiencies,
    or opportunities found in the data.
    """
    # Collect context for AI analysis
    context_parts = []

    # Get process types for context
    process_types = db.query(ProcessType).filter(ProcessType.is_active == True).all()
    process_type_names = [pt.name for pt in process_types]

    if process_type_names:
        context_parts.append(f"Elérhető folyamat típusok: {', '.join(process_type_names)}")

    # Analyze recent documents
    if analyze_documents:
        recent_docs = db.query(Document).order_by(Document.created_at.desc()).limit(10).all()
        if recent_docs:
            doc_info = []
            for doc in recent_docs:
                doc_info.append(f"- {doc.original_filename} (kategória: {doc.category or 'nincs'})")
            context_parts.append(f"Legutóbbi dokumentumok:\n" + "\n".join(doc_info))

    # Analyze recent emails
    if analyze_emails:
        recent_emails = db.query(Email).order_by(Email.received_date.desc()).limit(10).all()
        if recent_emails:
            email_info = []
            for email in recent_emails:
                subject = email.subject[:80] if email.subject else "(nincs tárgy)"
                sender = email.sender[:40] if email.sender else "ismeretlen"
                importance = email.importance or "Közepes"
                email_info.append(f"- {subject} (feladó: {sender}, fontosság: {importance})")
            context_parts.append(f"Legutóbbi emailek:\n" + "\n".join(email_info))

    if not context_parts:
        return IdeaGenerateResponse(
            success=False,
            generated_count=0,
            ideas=[],
            message="Nincs elegendő adat az elemzéshez. Töltsön fel dokumentumokat vagy importáljon emaileket."
        )

    # Get existing ideas to avoid duplicates
    existing_ideas = db.query(Idea).order_by(Idea.created_at.desc()).limit(20).all()
    existing_titles = [idea.title for idea in existing_ideas]

    if existing_titles:
        context_parts.append(f"Meglévő ötletek (kerüld a duplikációt): {', '.join(existing_titles[:10])}")

    full_context = "\n\n".join(context_parts)

    system_prompt = f"""Te egy workflow optimalizáló szakértő vagy. A feladatod munkafolyamat-javítási ötletek generálása a megadott dokumentumok és emailek alapján.

Elemezd a kontextust és generálj {max_ideas} konkrét, megvalósítható javítási javaslatot.

Minden ötlethez add meg:
1. Címet (rövid, max 60 karakter)
2. Leírást (részletes, 2-3 mondat)
3. Prioritást: Alacsony, Közepes, Magas vagy Kritikus
4. Kapcsolódó folyamat típust (ha releváns, a listából válassz)

Válaszolj CSAK JSON formátumban, egy tömbbel:
[
  {{
    "title": "Ötlet címe",
    "description": "Részletes leírás...",
    "priority": "Közepes",
    "suggested_process_type": "Folyamat neve vagy null"
  }}
]

Fókuszálj:
- Automatizálási lehetőségekre
- Kommunikációs fejlesztésekre
- Hatékonyság növelésére
- Dokumentum kezelés javítására"""

    user_message = f"""Az alábbi információk alapján generálj {max_ideas} munkafolyamat-javítási ötletet:

{full_context}

Generálj konkrét, megvalósítható javaslatokat JSON formátumban!"""

    messages = [{"role": "user", "content": user_message}]

    try:
        response_text, _, _ = await send_chat_message(
            messages=messages,
            db=db,
            system_prompt=system_prompt,
        )

        # Parse AI response
        import json
        import re

        # Try to extract JSON array from response
        json_match = re.search(r'\[[\s\S]*\]', response_text)
        if not json_match:
            return IdeaGenerateResponse(
                success=False,
                generated_count=0,
                ideas=[],
                message="Az AI nem adott megfelelő formátumú választ. Próbálja újra."
            )

        try:
            ai_ideas = json.loads(json_match.group())
        except json.JSONDecodeError:
            return IdeaGenerateResponse(
                success=False,
                generated_count=0,
                ideas=[],
                message="Nem sikerült feldolgozni az AI válaszát. Próbálja újra."
            )

        # Create ideas in database
        created_ideas = []
        for ai_idea in ai_ideas[:max_ideas]:
            title = ai_idea.get("title", "")[:500]
            if not title:
                continue

            # Check for duplicate title
            if title in existing_titles:
                continue

            description = ai_idea.get("description", "")
            priority = ai_idea.get("priority", "Közepes")

            # Validate priority
            if priority not in ["Alacsony", "Közepes", "Magas", "Kritikus"]:
                priority = "Közepes"

            # Find process type if suggested
            process_type_id = None
            suggested_type = ai_idea.get("suggested_process_type")
            if suggested_type:
                for pt in process_types:
                    if pt.name.lower() == suggested_type.lower():
                        process_type_id = pt.id
                        break

            db_idea = Idea(
                title=title,
                description=description,
                source="ai",
                status="Új",
                priority=priority,
                process_type_id=process_type_id,
            )
            db.add(db_idea)
            db.flush()  # Get ID without committing

            # Build response object
            idea_dict = {
                "id": db_idea.id,
                "title": db_idea.title,
                "description": db_idea.description,
                "source": db_idea.source,
                "status": db_idea.status,
                "priority": db_idea.priority,
                "process_type_id": db_idea.process_type_id,
                "created_at": db_idea.created_at,
                "updated_at": db_idea.updated_at,
                "process_type": None,
            }
            if process_type_id:
                pt = next((p for p in process_types if p.id == process_type_id), None)
                if pt:
                    idea_dict["process_type"] = ProcessTypeResponse(
                        id=pt.id,
                        name=pt.name,
                        description=pt.description,
                        quick_guide=pt.quick_guide,
                        order=pt.order,
                        is_active=pt.is_active,
                        created_at=pt.created_at,
                    )

            created_ideas.append(IdeaResponse(**idea_dict))
            existing_titles.append(title)  # Prevent duplicates within this batch

        db.commit()

        # Send notification for successful AI idea generation
        if created_ideas:
            await broadcast_notification(
                message=f"{len(created_ideas)} új ötlet generálva AI segítségével",
                level="success",
                title="AI ötlet generálás kész",
                action_url="/ideas"
            )

        return IdeaGenerateResponse(
            success=True,
            generated_count=len(created_ideas),
            ideas=created_ideas,
            message=f"Sikeresen generáltunk {len(created_ideas)} új ötletet."
        )

    except ValueError as e:
        return IdeaGenerateResponse(
            success=False,
            generated_count=0,
            ideas=[],
            message=f"AI szolgáltatás hiba: {str(e)}"
        )
    except Exception as e:
        return IdeaGenerateResponse(
            success=False,
            generated_count=0,
            ideas=[],
            message=f"Hiba történt az ötlet generálás során: {str(e)}"
        )
