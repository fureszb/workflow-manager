"""
UNIFIED EMBEDDING SERVICE
Egy függvény, ami automatikusan a megfelelő provider-t használja.
Támogatja: Ollama (lokális) és OpenRouter (API).
"""

import httpx
import numpy as np
from typing import List, Optional
from sqlalchemy.orm import Session

from app.services.embedding_config import get_model_dimension


# ══════════════════════════════════════════
# FŐ FÜGGVÉNY — ezt hívja minden más
# ══════════════════════════════════════════

async def generate_embedding(
    text: str,
    db: Session,
) -> Optional[List[float]]:
    """
    Egy szöveg → embedding vektor.

    Automatikusan a beállított provider-t használja.
    Nem kell tudnod, mi van mögötte — ez eldönti.
    """
    settings = get_embedding_settings(db)

    provider = settings["provider"]     # "ollama" vagy "openrouter"
    model = settings["model"]           # "bge-m3" vagy "openai/text-embedding-3-small"

    if provider == "ollama":
        return await _generate_ollama(
            text=text,
            model=model,
            ollama_url=settings["ollama_url"],
        )

    elif provider == "openrouter":
        return await _generate_openrouter(
            text=text,
            model=model,
            api_key=settings["openrouter_api_key"],
        )

    else:
        raise ValueError(f"Ismeretlen embedding provider: {provider}")


async def generate_embeddings_batch(
    texts: List[str],
    db: Session,
    batch_size: int = 32,
) -> List[Optional[List[float]]]:
    """
    Több szöveg → embedding vektorok.
    OpenRouter-nál batch-ben küldi (gyorsabb + olcsóbb).
    Ollama-nál egyenként (batch nem támogatott).
    """
    settings = get_embedding_settings(db)
    provider = settings["provider"]

    if provider == "openrouter":
        # OpenRouter támogatja a batch embedding-et!
        return await _generate_openrouter_batch(
            texts=texts,
            model=settings["model"],
            api_key=settings["openrouter_api_key"],
            batch_size=batch_size,
        )
    else:
        # Ollama: egyenként
        results = []
        for text in texts:
            emb = await _generate_ollama(
                text=text,
                model=settings["model"],
                ollama_url=settings["ollama_url"],
            )
            results.append(emb)
        return results


# ══════════════════════════════════════════
# OLLAMA PROVIDER
# ══════════════════════════════════════════

async def _generate_ollama(
    text: str,
    model: str = "bge-m3",
    ollama_url: str = "http://localhost:11434",
) -> Optional[List[float]]:
    """Ollama embedding generálás (lokális)."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ollama_url}/api/embeddings",
                json={
                    "model": model,
                    "prompt": text,
                },
            )
            response.raise_for_status()
            result = response.json()
            return result.get("embedding")

    except httpx.TimeoutException:
        print(f"[Ollama] Timeout: {model}")
        return None
    except Exception as e:
        print(f"[Ollama] Hiba: {e}")
        return None


# ══════════════════════════════════════════
# OPENROUTER PROVIDER
# ══════════════════════════════════════════

async def _generate_openrouter(
    text: str,
    model: str = "openai/text-embedding-3-small",
    api_key: str = None,
) -> Optional[List[float]]:
    """OpenRouter embedding generálás (API)."""
    if not api_key:
        raise ValueError("OpenRouter API kulcs nincs beállítva!")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost",  # OpenRouter prefers this
                    "X-Title": "Workflow Manager",
                },
                json={
                    "model": model,
                    "input": text,
                },
            )
            response.raise_for_status()
            result = response.json()
            return result["data"][0]["embedding"]

    except httpx.TimeoutException:
        print(f"[OpenRouter] Timeout: {model}")
        return None
    except Exception as e:
        print(f"[OpenRouter] Hiba: {e}")
        return None


async def _generate_openrouter_batch(
    texts: List[str],
    model: str = "openai/text-embedding-3-small",
    api_key: str = None,
    batch_size: int = 32,
) -> List[Optional[List[float]]]:
    """
    OpenRouter BATCH embedding — egyetlen API hívásban
    akár 32 szöveget is elküld!

    MIÉRT JÓ?
    - Gyorsabb: 1 hívás 32 szövegre, nem 32 hívás
    - Olcsóbb: kevesebb overhead
    """
    if not api_key:
        raise ValueError("OpenRouter API kulcs nincs beállítva!")

    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.openrouter.ai/api/v1/embeddings",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost",
                        "X-Title": "Workflow Manager",
                    },
                    json={
                        "model": model,
                        "input": batch,
                    },
                )
                response.raise_for_status()
                result = response.json()

                # Az OpenRouter indexelve adja vissza
                batch_embeddings = [None] * len(batch)
                for item in result["data"]:
                    batch_embeddings[item["index"]] = item["embedding"]

                all_embeddings.extend(batch_embeddings)

        except Exception as e:
            print(f"[OpenRouter Batch] Hiba: {e}")
            all_embeddings.extend([None] * len(batch))

    return all_embeddings


# ══════════════════════════════════════════
# BEÁLLÍTÁSOK LEKÉRDEZÉSE
# ══════════════════════════════════════════

def get_embedding_settings(db: Session) -> dict:
    """Embedding beállítások lekérdezése az adatbázisból."""
    from app.models.models import SystemSettings

    settings = db.query(SystemSettings).first()

    if not settings:
        # Alapértelmezett beállítások
        return {
            "provider": "ollama",
            "model": "bge-m3",
            "dimension": 1024,
            "ollama_url": "http://localhost:11434",
            "openrouter_api_key": None,
        }

    return {
        "provider": settings.embedding_provider,
        "model": settings.embedding_model,
        "dimension": settings.embedding_dimension,
        "ollama_url": settings.ollama_url,
        "openrouter_api_key": settings.openrouter_api_key,
    }
