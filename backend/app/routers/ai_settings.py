from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.models import AppSetting, AIPersonality, AIKnowledgeLog, PersonalityChangeLog, Document, DocumentChunk
from app.schemas.schemas import (
    AIPersonalityResponse,
    AIPersonalityUpdate,
    AIKnowledgeLogResponse,
    KnowledgeBaseStats,
    KnowledgeDocumentResponse,
    PersonalityChangeLogResponse,
)
from app.services.ai_service import (
    test_ollama_connection,
    test_openrouter_connection,
    fetch_openrouter_models,
    DEFAULT_OLLAMA_URL,
    DEFAULT_OLLAMA_MODEL,
)

router = APIRouter(prefix="/ai")


class TestConnectionRequest(BaseModel):
    provider: str = "ollama"
    ollama_url: Optional[str] = None
    ollama_model: Optional[str] = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    available_models: List[str] = []
    model_available: bool = False
    total_models: Optional[int] = None


class OpenRouterModelResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    context_length: Optional[int] = None
    pricing: Optional[dict] = None
    top_provider: Optional[dict] = None


@router.get("/personality", response_model=Dict[str, AIPersonalityResponse])
def get_personality(db: Session = Depends(get_db)):
    """Get AI personalities for all providers.

    Returns a dict with keys 'ollama' and 'openrouter', each containing the personality config.
    If no personality exists for a provider, creates a default one.
    """
    result = {}

    for provider in ["ollama", "openrouter"]:
        personality = db.query(AIPersonality).filter(
            AIPersonality.provider == provider
        ).first()

        if not personality:
            # Create default personality for this provider
            personality = AIPersonality(
                provider=provider,
                name="Asszisztens" if provider == "ollama" else "Online Asszisztens",
                system_prompt="Te egy segítőkész AI asszisztens vagy, aki magyar nyelven válaszol.",
                tone="professional",
                expertise="",
                language="magyar",
                is_active=True,
            )
            db.add(personality)
            db.commit()
            db.refresh(personality)

        result[provider] = personality

    return result


def _log_personality_change(db: Session, provider: str, field: str, old_val: Any, new_val: Any):
    """Log a personality field change."""
    log_entry = PersonalityChangeLog(
        provider=provider,
        field_changed=field,
        old_value=str(old_val) if old_val is not None else None,
        new_value=str(new_val) if new_val is not None else None,
    )
    db.add(log_entry)


@router.put("/personality/{provider}", response_model=AIPersonalityResponse)
def update_personality(
    provider: str,
    request: AIPersonalityUpdate,
    db: Session = Depends(get_db),
):
    """Update AI personality for a specific provider.

    Args:
        provider: 'ollama' or 'openrouter'
        request: Personality update data
    """
    if provider not in ["ollama", "openrouter"]:
        raise HTTPException(status_code=400, detail="Érvénytelen szolgáltató. Használj 'ollama' vagy 'openrouter' értéket.")

    personality = db.query(AIPersonality).filter(
        AIPersonality.provider == provider
    ).first()

    if not personality:
        # Create new personality if it doesn't exist
        personality = AIPersonality(
            provider=provider,
            name=request.name or "Asszisztens",
            system_prompt=request.system_prompt,
            tone=request.tone or "professional",
            expertise=request.expertise or "",
            language=request.language or "magyar",
            is_active=request.is_active if request.is_active is not None else True,
        )
        db.add(personality)
        db.commit()
        db.refresh(personality)
        # Log initial creation
        _log_personality_change(db, provider, "created", None, personality.name)
        db.commit()
    else:
        # Update existing personality and log changes
        if request.name is not None and request.name != personality.name:
            _log_personality_change(db, provider, "name", personality.name, request.name)
            personality.name = request.name
        if request.system_prompt is not None and request.system_prompt != personality.system_prompt:
            _log_personality_change(db, provider, "system_prompt", personality.system_prompt[:100] if personality.system_prompt else None, request.system_prompt[:100] if request.system_prompt else None)
            personality.system_prompt = request.system_prompt
        if request.tone is not None and request.tone != personality.tone:
            _log_personality_change(db, provider, "tone", personality.tone, request.tone)
            personality.tone = request.tone
        if request.expertise is not None and request.expertise != personality.expertise:
            _log_personality_change(db, provider, "expertise", personality.expertise, request.expertise)
            personality.expertise = request.expertise
        if request.language is not None and request.language != personality.language:
            _log_personality_change(db, provider, "language", personality.language, request.language)
            personality.language = request.language
        if request.is_active is not None and request.is_active != personality.is_active:
            _log_personality_change(db, provider, "is_active", str(personality.is_active), str(request.is_active))
            personality.is_active = request.is_active

        db.commit()
        db.refresh(personality)

    return personality


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    db: Session = Depends(get_db),
):
    """Test connection to the specified AI provider.

    For Ollama: Tests if the server is reachable and the model is available.
    """
    if request.provider == "ollama":
        # Get settings from DB if not provided in request
        ollama_url = request.ollama_url
        ollama_model = request.ollama_model

        if not ollama_url or not ollama_model:
            settings = {}
            rows = db.query(AppSetting).filter(
                AppSetting.key.in_(["ollama_url", "ollama_model", "ollama_base_url"])
            ).all()
            for row in rows:
                settings[row.key] = row.value

            if not ollama_url:
                ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or DEFAULT_OLLAMA_URL
            if not ollama_model:
                ollama_model = settings.get("ollama_model") or DEFAULT_OLLAMA_MODEL

        result = await test_ollama_connection(
            ollama_url=ollama_url,
            model=ollama_model,
        )
        return TestConnectionResponse(**result)

    elif request.provider == "openrouter":
        # Get API key from DB
        api_key_row = db.query(AppSetting).filter(
            AppSetting.key == "openrouter_api_key"
        ).first()
        api_key = api_key_row.value if api_key_row else None

        if not api_key:
            return TestConnectionResponse(
                success=False,
                message="OpenRouter API kulcs nincs beállítva. Kérjük, állítsa be a Beállítások oldalon.",
                available_models=[],
                model_available=False,
            )

        result = await test_openrouter_connection(api_key)
        return TestConnectionResponse(**result)

    return TestConnectionResponse(
        success=False,
        message=f"Ismeretlen szolgáltató: {request.provider}",
        available_models=[],
        model_available=False,
    )


@router.get("/models/openrouter", response_model=List[OpenRouterModelResponse])
async def get_openrouter_models(
    db: Session = Depends(get_db),
    force_refresh: bool = False,
):
    """Get available models from OpenRouter API.

    Args:
        force_refresh: If True, bypass cache and fetch fresh data

    Returns:
        List of available OpenRouter models with pricing info
    """
    # Get API key from settings
    api_key_row = db.query(AppSetting).filter(
        AppSetting.key == "openrouter_api_key"
    ).first()

    if not api_key_row or not api_key_row.value:
        raise HTTPException(
            status_code=400,
            detail="OpenRouter API kulcs nincs beállítva. Kérjük, állítsa be a Beállítások oldalon."
        )

    try:
        models = await fetch_openrouter_models(api_key_row.value, force_refresh=force_refresh)

        # Transform to response format
        result = []
        for model in models:
            result.append(OpenRouterModelResponse(
                id=model.get("id", ""),
                name=model.get("name", model.get("id", "")),
                description=model.get("description"),
                context_length=model.get("context_length"),
                pricing=model.get("pricing"),
                top_provider=model.get("top_provider"),
            ))

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hiba a modellek lekérésekor: {str(e)}")


@router.get("/knowledge-log", response_model=List[AIKnowledgeLogResponse])
def get_knowledge_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None, description="Filter by action: added, removed"),
    db: Session = Depends(get_db),
):
    """Get AI knowledge base learning log.

    Returns a list of all document additions/removals from the knowledge base.
    """
    query = db.query(AIKnowledgeLog).order_by(desc(AIKnowledgeLog.created_at))

    if action:
        query = query.filter(AIKnowledgeLog.action == action)

    logs = query.offset(offset).limit(limit).all()

    # Enrich with document filename
    result = []
    for log in logs:
        doc = db.query(Document).filter(Document.id == log.document_id).first() if log.document_id else None
        result.append(AIKnowledgeLogResponse(
            id=log.id,
            document_id=log.document_id,
            action=log.action,
            chunks_processed=log.chunks_processed,
            status=log.status,
            error_message=log.error_message,
            created_at=log.created_at,
            document_filename=doc.original_filename if doc else None,
        ))

    return result


@router.get("/knowledge-documents", response_model=List[KnowledgeDocumentResponse])
def get_knowledge_documents(db: Session = Depends(get_db)):
    """Get all documents in the knowledge base with chunk counts."""
    documents = db.query(Document).filter(Document.is_knowledge == True).order_by(desc(Document.updated_at)).all()

    result = []
    for doc in documents:
        chunk_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
        result.append(KnowledgeDocumentResponse(
            id=doc.id,
            original_filename=doc.original_filename,
            file_type=doc.file_type,
            file_size=doc.file_size,
            category=doc.category,
            chunk_count=chunk_count,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        ))

    return result


@router.get("/knowledge-stats", response_model=KnowledgeBaseStats)
def get_knowledge_stats(db: Session = Depends(get_db)):
    """Get knowledge base statistics."""
    from app.services.rag_service import get_faiss_index

    # Count knowledge documents
    total_docs = db.query(Document).filter(Document.is_knowledge == True).count()

    # Count total chunks
    total_chunks = db.query(DocumentChunk).count()

    # Get FAISS index stats
    faiss_index = get_faiss_index()
    total_vectors = faiss_index.index.ntotal if faiss_index.index else 0

    # Get last update time
    last_log = db.query(AIKnowledgeLog).order_by(desc(AIKnowledgeLog.created_at)).first()
    last_update = last_log.created_at if last_log else None

    # Documents by type
    type_counts = db.query(
        Document.file_type,
        func.count(Document.id)
    ).filter(Document.is_knowledge == True).group_by(Document.file_type).all()
    docs_by_type = {t or "unknown": c for t, c in type_counts}

    return KnowledgeBaseStats(
        total_documents=total_docs,
        total_chunks=total_chunks,
        total_vectors=total_vectors,
        last_update=last_update,
        documents_by_type=docs_by_type,
    )


@router.delete("/knowledge-documents/{doc_id}")
async def remove_from_knowledge_base(doc_id: int, db: Session = Depends(get_db)):
    """Remove a document from the knowledge base.

    This removes the document from the FAISS index and deletes its chunks.
    The document itself is NOT deleted, only its is_knowledge flag is set to False.
    """
    from app.services.rag_service import remove_document_from_index

    document = db.query(Document).filter(Document.id == doc_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Dokumentum nem található")

    if not document.is_knowledge:
        raise HTTPException(status_code=400, detail="A dokumentum nincs a tudásbázisban")

    # Get chunk count before removal for logging
    chunk_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).count()

    # Remove from FAISS index and delete chunks
    await remove_document_from_index(doc_id, db)

    # Update document flag
    document.is_knowledge = False
    db.commit()

    # Log the removal
    log_entry = AIKnowledgeLog(
        document_id=doc_id,
        action="removed",
        chunks_processed=chunk_count,
        status="completed",
    )
    db.add(log_entry)
    db.commit()

    return {"message": "Dokumentum eltávolítva a tudásbázisból", "chunks_removed": chunk_count}


@router.get("/personality-log", response_model=List[PersonalityChangeLogResponse])
def get_personality_change_log(
    limit: int = Query(50, ge=1, le=200),
    provider: Optional[str] = Query(None, description="Filter by provider: ollama, openrouter"),
    db: Session = Depends(get_db),
):
    """Get AI personality change log."""
    query = db.query(PersonalityChangeLog).order_by(desc(PersonalityChangeLog.created_at))

    if provider:
        query = query.filter(PersonalityChangeLog.provider == provider)

    logs = query.limit(limit).all()

    return [PersonalityChangeLogResponse(
        id=log.id,
        provider=log.provider,
        field_changed=log.field_changed,
        old_value=log.old_value,
        new_value=log.new_value,
        created_at=log.created_at,
    ) for log in logs]
