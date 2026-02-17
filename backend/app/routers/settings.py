from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import httpx

from app.core.database import get_db
from app.models.models import AppSetting, SystemSettings
from app.services.embedding_config import (
    EMBEDDING_MODELS,
    get_model_dimension,
    get_available_models,
)

router = APIRouter(prefix="/settings")


# ── Request/Response modellek ──

class EmbeddingSettingsRequest(BaseModel):
    provider: str          # "ollama" vagy "openrouter"
    model: str             # "bge-m3", "text-embedding-3-small", stb.
    openrouter_api_key: Optional[str] = None


class EmbeddingSettingsResponse(BaseModel):
    provider: str
    model: str
    dimension: int
    has_openrouter_key: bool
    available_models: dict


# ── AppSetting endpoints (legacy) ──

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).all()
    return {row.key: row.value for row in rows}


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not row:
        return {"key": key, "value": None}
    return {"key": row.key, "value": row.value}


@router.put("")
def update_settings(body: dict, db: Session = Depends(get_db)):
    for key, value in body.items():
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row:
            row.value = value
        else:
            row = AppSetting(key=key, value=value)
            db.add(row)
    db.commit()
    rows = db.query(AppSetting).all()
    return {r.key: r.value for r in rows}


@router.put("/{key}")
def update_setting(key: str, body: dict, db: Session = Depends(get_db)):
    value = body.get("value")
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = AppSetting(key=key, value=value)
        db.add(row)
    db.commit()
    db.refresh(row)
    return {"key": row.key, "value": row.value}


# ── GET: Jelenlegi embedding beállítások ──

@router.get("/embedding/config")
def get_embedding_settings(db: Session = Depends(get_db)):
    """Jelenlegi embedding beállítások lekérdezése."""
    settings = db.query(SystemSettings).first()

    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "provider": settings.embedding_provider,
        "model": settings.embedding_model,
        "dimension": settings.embedding_dimension,
        "has_openrouter_key": bool(settings.openrouter_api_key),
        "ollama_url": settings.ollama_url,
        "available_models": EMBEDDING_MODELS,
    }


# ── PUT: Embedding beállítások módosítása ──

@router.put("/embedding/config")
async def update_embedding_settings(
    request: EmbeddingSettingsRequest,
    db: Session = Depends(get_db),
):
    """
    Embedding beállítások módosítása.
    ⚠️ Ha provider vagy modell változik → újraindexelés kell!
    """
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)

    # Validálás: létezik-e a modell?
    available = get_available_models(request.provider)
    if request.model not in available:
        raise HTTPException(
            400,
            f"Ismeretlen modell: {request.model}. "
            f"Elérhető: {list(available.keys())}",
        )

    # OpenRouter-hoz kell API kulcs
    if request.provider == "openrouter":
        api_key = request.openrouter_api_key or settings.openrouter_api_key
        if not api_key:
            raise HTTPException(
                400,
                "OpenRouter provider-hez API kulcs szükséges!",
            )
        settings.openrouter_api_key = api_key

    # Változott-e a provider/modell?
    provider_changed = settings.embedding_provider != request.provider
    model_changed = settings.embedding_model != request.model
    reindex_required = provider_changed or model_changed

    # Beállítások mentése
    old_provider = settings.embedding_provider
    old_model = settings.embedding_model

    settings.embedding_provider = request.provider
    settings.embedding_model = request.model
    settings.embedding_dimension = get_model_dimension(
        request.provider, request.model
    )

    db.commit()

    return {
        "message": "Beállítások mentve!",
        "provider": request.provider,
        "model": request.model,
        "dimension": settings.embedding_dimension,
        "reindex_required": reindex_required,
        "warning": (
            f"⚠️ Provider/modell változott "
            f"({old_provider}/{old_model} → "
            f"{request.provider}/{request.model}). "
            f"Újraindexelés szükséges!"
            if reindex_required
            else None
        ),
    }


# ── POST: OpenRouter API kulcs tesztelése ──

@router.post("/embedding/test-openrouter")
async def test_openrouter_key(
    api_key: str,
    db: Session = Depends(get_db),
):
    """OpenRouter API kulcs tesztelése egy próba embedding-gel."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://api.openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost",
                    "X-Title": "Workflow Manager",
                },
                json={
                    "model": "openai/text-embedding-3-small",
                    "input": "test",
                },
            )

        if response.status_code == 200:
            return {"status": "ok", "message": "✅ OpenRouter API kulcs érvényes!"}
        elif response.status_code == 401:
            return {"status": "error", "message": "❌ Érvénytelen OpenRouter API kulcs!"}
        else:
            return {
                "status": "error",
                "message": f"❌ Hiba: {response.status_code}",
            }

    except Exception as e:
        return {"status": "error", "message": f"❌ Kapcsolódási hiba: {e}"}


# ── GET: Ollama modellek ellenőrzése ──

@router.get("/embedding/check-ollama")
async def check_ollama_models(db: Session = Depends(get_db)):
    """Megnézi, mely Ollama modellek vannak letöltve."""
    settings = db.query(SystemSettings).first()
    ollama_url = settings.ollama_url if settings else "http://localhost:11434"

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{ollama_url}/api/tags")

        if response.status_code != 200:
            return {"status": "error", "message": "Ollama nem elérhető"}

        installed = response.json().get("models", [])
        installed_names = [m["name"].split(":")[0] for m in installed]

        # Melyik embedding modell van meg?
        available_embedding = EMBEDDING_MODELS.get("ollama", {})
        result = {}
        for model_id, config in available_embedding.items():
            result[model_id] = {
                **config,
                "installed": model_id in installed_names,
            }

        return {
            "status": "ok",
            "ollama_url": ollama_url,
            "models": result,
        }

    except Exception as e:
        return {"status": "error", "message": f"Ollama nem elérhető: {e}"}

