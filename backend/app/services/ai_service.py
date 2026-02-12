"""AI service for guide generation using Ollama or OpenRouter."""
import httpx
from typing import Optional, Tuple, Dict, List, Any
from sqlalchemy.orm import Session

from app.models.models import AppSetting, TokenUsage


# Default settings
DEFAULT_OLLAMA_URL = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = "ajindal/llama3.1-storm:8b-q4_k_m"
DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_MODEL = "meta-llama/llama-3.2-3b-instruct:free"

# Cache for OpenRouter model pricing (to avoid repeated API calls)
_openrouter_models_cache: Dict[str, Any] = {}
_openrouter_cache_timestamp: float = 0
CACHE_TTL_SECONDS = 3600  # 1 hour cache


def get_ai_settings(db: Session) -> dict:
    """Get AI settings from the database."""
    settings = {}
    rows = db.query(AppSetting).filter(
        AppSetting.key.in_([
            "ai_provider",
            "ollama_url",
            "ollama_base_url",
            "ollama_model",
            "openrouter_api_key",
            "openrouter_model",
            "openrouter_default_model",
        ])
    ).all()

    for row in rows:
        settings[row.key] = row.value

    return settings


async def fetch_openrouter_models(api_key: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
    """Fetch available models from OpenRouter API.

    Args:
        api_key: OpenRouter API key
        force_refresh: If True, bypass cache and fetch fresh data

    Returns:
        List of model dictionaries with id, name, pricing info
    """
    import time
    global _openrouter_models_cache, _openrouter_cache_timestamp

    current_time = time.time()

    # Check cache validity
    if (not force_refresh
        and _openrouter_models_cache
        and (current_time - _openrouter_cache_timestamp) < CACHE_TTL_SECONDS):
        return list(_openrouter_models_cache.values())

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{DEFAULT_OPENROUTER_URL}/models",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
            )
            response.raise_for_status()
            data = response.json()

            models = data.get("data", [])

            # Update cache
            _openrouter_models_cache = {m["id"]: m for m in models}
            _openrouter_cache_timestamp = current_time

            return models

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise ValueError("Érvénytelen OpenRouter API kulcs.")
        raise
    except httpx.ConnectError:
        raise ValueError("Nem sikerült kapcsolódni az OpenRouter API-hoz.")
    except Exception as e:
        raise ValueError(f"Hiba az OpenRouter modellek lekérésekor: {str(e)}")


def get_model_pricing(model_id: str) -> Dict[str, float]:
    """Get pricing for a specific model from cache.

    Args:
        model_id: The OpenRouter model ID

    Returns:
        Dict with prompt_price and completion_price per token (in USD)
    """
    if model_id in _openrouter_models_cache:
        model = _openrouter_models_cache[model_id]
        pricing = model.get("pricing", {})
        return {
            "prompt_price": float(pricing.get("prompt", 0)),
            "completion_price": float(pricing.get("completion", 0)),
        }
    return {"prompt_price": 0.0, "completion_price": 0.0}


def calculate_cost(
    model_id: str,
    input_tokens: int,
    output_tokens: int,
    manual_override: Optional[Dict[str, float]] = None,
) -> float:
    """Calculate the cost for a given number of tokens.

    Args:
        model_id: The model ID used
        input_tokens: Number of input/prompt tokens
        output_tokens: Number of output/completion tokens
        manual_override: Optional dict with prompt_price and completion_price to override API prices

    Returns:
        Total cost in USD
    """
    if manual_override:
        pricing = manual_override
    else:
        pricing = get_model_pricing(model_id)

    # OpenRouter prices are per token (not per 1000 tokens)
    prompt_cost = input_tokens * pricing["prompt_price"]
    completion_cost = output_tokens * pricing["completion_price"]

    return prompt_cost + completion_cost


async def test_openrouter_connection(api_key: str) -> Dict[str, Any]:
    """Test connection to OpenRouter API.

    Args:
        api_key: OpenRouter API key

    Returns:
        Dict with success status, message, and available models count
    """
    if not api_key:
        return {
            "success": False,
            "message": "OpenRouter API kulcs nincs megadva.",
            "available_models": [],
            "model_available": False,
        }

    try:
        models = await fetch_openrouter_models(api_key, force_refresh=True)

        return {
            "success": True,
            "message": f"OpenRouter kapcsolat sikeres! {len(models)} modell elérhető.",
            "available_models": [m["id"] for m in models[:50]],  # Return first 50 model IDs
            "model_available": True,
            "total_models": len(models),
        }

    except ValueError as e:
        return {
            "success": False,
            "message": str(e),
            "available_models": [],
            "model_available": False,
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Hiba az OpenRouter kapcsolat tesztelésekor: {str(e)}",
            "available_models": [],
            "model_available": False,
        }


async def generate_guide_with_ollama(
    document_content: str,
    process_name: str,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_OLLAMA_MODEL,
) -> str:
    """Generate a quick guide using Ollama."""

    system_prompt = """Te egy segítokész asszisztens vagy, aki folyamatleírások alapján rövid,
    lényegre törő gyors útmutatókat készít magyar nyelven. Az útmutató legyen:
    - Tömör és áttekinthető
    - Lépésről lépésre vezesse végig a felhasználót
    - Használj számozott listát a lépésekhez
    - Emeld ki a fontos információkat
    - Maximum 500 szó"""

    user_prompt = f"""A következő dokumentum(ok) alapján készíts egy gyors útmutatót a "{process_name}" folyamathoz.

Dokumentum tartalma:
{document_content}

Készítsd el a gyors útmutatót magyar nyelven!"""

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ollama_url}/api/generate",
            json={
                "model": model,
                "prompt": user_prompt,
                "system": system_prompt,
                "stream": False,
            }
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")


async def generate_guide_with_openrouter(
    document_content: str,
    process_name: str,
    api_key: str,
    model: str = DEFAULT_OPENROUTER_MODEL,
) -> str:
    """Generate a quick guide using OpenRouter."""

    system_prompt = """Te egy segítokész asszisztens vagy, aki folyamatleírások alapján rövid,
    lényegre törő gyors útmutatókat készít magyar nyelven. Az útmutató legyen:
    - Tömör és áttekinthető
    - Lépésről lépésre vezesse végig a felhasználót
    - Használj számozott listát a lépésekhez
    - Emeld ki a fontos információkat
    - Maximum 500 szó"""

    user_prompt = f"""A következő dokumentum(ok) alapján készíts egy gyors útmutatót a "{process_name}" folyamathoz.

Dokumentum tartalma:
{document_content}

Készítsd el a gyors útmutatót magyar nyelven!"""

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{DEFAULT_OPENROUTER_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            }
        )
        response.raise_for_status()
        result = response.json()
        return result.get("choices", [{}])[0].get("message", {}).get("content", "")


async def generate_quick_guide(
    document_content: str,
    process_name: str,
    db: Session,
) -> str:
    """Generate a quick guide using the configured AI provider.

    Args:
        document_content: The content of the uploaded documents
        process_name: The name of the process type
        db: Database session for fetching settings

    Returns:
        Generated quick guide text
    """
    settings = get_ai_settings(db)

    provider = settings.get("ai_provider", "ollama")

    if provider == "openrouter":
        api_key = settings.get("openrouter_api_key")
        if not api_key:
            raise ValueError("OpenRouter API kulcs nincs beállítva. Kérjük, állítsa be a Beállítások oldalon.")

        model = settings.get("openrouter_model", DEFAULT_OPENROUTER_MODEL)
        return await generate_guide_with_openrouter(
            document_content=document_content,
            process_name=process_name,
            api_key=api_key,
            model=model,
        )
    else:
        # Default to Ollama
        ollama_url = settings.get("ollama_url", DEFAULT_OLLAMA_URL)
        model = settings.get("ollama_model", DEFAULT_OLLAMA_MODEL)
        return await generate_guide_with_ollama(
            document_content=document_content,
            process_name=process_name,
            ollama_url=ollama_url,
            model=model,
        )


def extract_text_from_file(file_path: str, file_type: Optional[str]) -> str:
    """Extract text content from a file.

    Supports: txt, md, pdf (basic), docx (basic)
    """
    if not file_type:
        return ""

    file_type = file_type.lower()

    try:
        if file_type in ("txt", "md", "markdown"):
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()

        elif file_type == "pdf":
            # Try to use PyPDF2 if available
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
            except ImportError:
                return "[PDF fájl - szöveg kinyerés nem támogatott. Telepítse a PyPDF2 csomagot.]"

        elif file_type in ("docx", "doc"):
            # Try to use python-docx if available
            try:
                from docx import Document
                doc = Document(file_path)
                text = ""
                for para in doc.paragraphs:
                    text += para.text + "\n"
                return text
            except ImportError:
                return "[DOCX fájl - szöveg kinyerés nem támogatott. Telepítse a python-docx csomagot.]"

        else:
            return f"[{file_type.upper()} fájl - szöveg kinyerés nem támogatott ehhez a formátumhoz.]"

    except Exception as e:
        return f"[Hiba a fájl olvasásakor: {str(e)}]"


async def test_ollama_connection(
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_OLLAMA_MODEL,
) -> dict:
    """Test connection to Ollama server.

    Args:
        ollama_url: The Ollama server URL
        model: The model to test with

    Returns:
        Dict with success status, message, and model info
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # First check if Ollama is running by getting version/tags
            tags_response = await client.get(f"{ollama_url}/api/tags")
            tags_response.raise_for_status()
            tags_data = tags_response.json()

            available_models = [m.get("name", "") for m in tags_data.get("models", [])]

            # Check if the specified model is available
            model_available = any(model in m or m in model for m in available_models)

            if not model_available and available_models:
                return {
                    "success": True,
                    "message": f"Ollama kapcsolódva, de a '{model}' modell nincs telepítve.",
                    "available_models": available_models,
                    "model_available": False,
                }

            # Try a simple generation to verify the model works
            if model_available:
                test_response = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": "Hi",
                        "stream": False,
                    },
                    timeout=30.0,
                )
                test_response.raise_for_status()

            return {
                "success": True,
                "message": "Ollama kapcsolat sikeres!",
                "available_models": available_models,
                "model_available": model_available,
            }

    except httpx.ConnectError:
        return {
            "success": False,
            "message": f"Nem sikerült kapcsolódni az Ollama szerverhez: {ollama_url}",
            "available_models": [],
            "model_available": False,
        }
    except httpx.TimeoutException:
        return {
            "success": False,
            "message": "Időtúllépés az Ollama szerver elérésekor.",
            "available_models": [],
            "model_available": False,
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Hiba az Ollama kapcsolat tesztelésekor: {str(e)}",
            "available_models": [],
            "model_available": False,
        }


def estimate_tokens(text: str) -> int:
    """Estimate token count for a text string.

    Uses a simple heuristic: ~4 characters per token for English,
    ~2.5 characters per token for Hungarian (due to longer words).
    This is a rough estimate; actual tokenization varies by model.
    """
    if not text:
        return 0
    # Average estimate between English and Hungarian
    chars_per_token = 3.5
    return max(1, int(len(text) / chars_per_token))


def save_token_usage(
    db: Session,
    provider: str,
    model_name: str,
    input_tokens: int,
    output_tokens: int,
    cost: float = 0.0,
) -> TokenUsage:
    """Save token usage to the database.

    Args:
        db: Database session
        provider: AI provider (ollama, openrouter)
        model_name: Model name used
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        cost: Cost in USD (default 0 for local models)

    Returns:
        Created TokenUsage record
    """
    usage = TokenUsage(
        provider=provider,
        model_name=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost=cost,
    )
    db.add(usage)
    db.commit()
    db.refresh(usage)
    return usage


async def chat_with_ollama(
    messages: list,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_OLLAMA_MODEL,
    system_prompt: Optional[str] = None,
) -> Tuple[str, int, int]:
    """Send chat messages to Ollama and get a response.

    Args:
        messages: List of message dicts with 'role' and 'content'
        ollama_url: The Ollama server URL
        model: The model to use
        system_prompt: Optional system prompt

    Returns:
        Tuple of (response_text, input_tokens, output_tokens)
    """
    # Build the prompt from messages
    prompt_parts = []
    if system_prompt:
        prompt_parts.append(f"System: {system_prompt}\n\n")

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            prompt_parts.append(f"User: {content}\n")
        elif role == "assistant":
            prompt_parts.append(f"Assistant: {content}\n")

    full_prompt = "".join(prompt_parts)

    # Estimate input tokens
    input_tokens = estimate_tokens(full_prompt)

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{ollama_url}/api/generate",
            json={
                "model": model,
                "prompt": full_prompt,
                "stream": False,
            }
        )
        response.raise_for_status()
        result = response.json()

        response_text = result.get("response", "")

        # Get actual token counts from Ollama if available, otherwise estimate
        eval_count = result.get("eval_count", 0)
        prompt_eval_count = result.get("prompt_eval_count", 0)

        if eval_count > 0:
            output_tokens = eval_count
        else:
            output_tokens = estimate_tokens(response_text)

        if prompt_eval_count > 0:
            input_tokens = prompt_eval_count

        return response_text, input_tokens, output_tokens


async def chat_with_openrouter(
    messages: list,
    api_key: str,
    model: str = DEFAULT_OPENROUTER_MODEL,
    system_prompt: Optional[str] = None,
) -> Tuple[str, int, int, float]:
    """Send chat messages to OpenRouter and get a response.

    Args:
        messages: List of message dicts with 'role' and 'content'
        api_key: OpenRouter API key
        model: The model to use
        system_prompt: Optional system prompt

    Returns:
        Tuple of (response_text, input_tokens, output_tokens, cost_usd)
    """
    api_messages = []
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})

    for msg in messages:
        api_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{DEFAULT_OPENROUTER_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": api_messages,
            }
        )
        response.raise_for_status()
        result = response.json()

        response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")

        # Get token usage from OpenRouter response
        usage = result.get("usage", {})
        input_tokens = usage.get("prompt_tokens", estimate_tokens(str(api_messages)))
        output_tokens = usage.get("completion_tokens", estimate_tokens(response_text))

        # Calculate cost based on model pricing
        cost_usd = calculate_cost(model, input_tokens, output_tokens)

        return response_text, input_tokens, output_tokens, cost_usd


async def send_chat_message(
    messages: list,
    db: Session,
    system_prompt: Optional[str] = None,
) -> Tuple[str, int, int]:
    """Send chat message using configured AI provider.

    Args:
        messages: List of message dicts with 'role' and 'content'
        db: Database session for settings and token tracking
        system_prompt: Optional system prompt

    Returns:
        Tuple of (response_text, input_tokens, output_tokens)
    """
    settings = get_ai_settings(db)
    provider = settings.get("ai_provider", "ollama")
    cost_usd = 0.0

    if provider == "openrouter":
        api_key = settings.get("openrouter_api_key")
        if not api_key:
            raise ValueError("OpenRouter API kulcs nincs beállítva.")

        # Support both openrouter_model and openrouter_default_model keys
        model = settings.get("openrouter_model") or settings.get("openrouter_default_model") or DEFAULT_OPENROUTER_MODEL
        response_text, input_tokens, output_tokens, cost_usd = await chat_with_openrouter(
            messages=messages,
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
        )
    else:
        # Default to Ollama
        ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or DEFAULT_OLLAMA_URL
        model = settings.get("ollama_model", DEFAULT_OLLAMA_MODEL)
        response_text, input_tokens, output_tokens = await chat_with_ollama(
            messages=messages,
            ollama_url=ollama_url,
            model=model,
            system_prompt=system_prompt,
        )
        cost_usd = 0.0  # Local Ollama is free

    # Save token usage with cost
    save_token_usage(
        db=db,
        provider=provider,
        model_name=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost=cost_usd,
    )

    return response_text, input_tokens, output_tokens


async def send_chat_message_with_provider(
    messages: list,
    db: Session,
    provider: str,
    model_name: str,
    system_prompt: Optional[str] = None,
) -> Tuple[str, int, int]:
    """Send chat message using a specified AI provider and model.

    Args:
        messages: List of message dicts with 'role' and 'content'
        db: Database session for settings and token tracking
        provider: AI provider ('ollama' or 'openrouter')
        model_name: Model name to use
        system_prompt: Optional system prompt

    Returns:
        Tuple of (response_text, input_tokens, output_tokens)
    """
    settings = get_ai_settings(db)
    cost_usd = 0.0

    if provider == "openrouter":
        api_key = settings.get("openrouter_api_key")
        if not api_key:
            raise ValueError("OpenRouter API kulcs nincs beállítva.")

        model = model_name or settings.get("openrouter_model") or settings.get("openrouter_default_model") or DEFAULT_OPENROUTER_MODEL
        response_text, input_tokens, output_tokens, cost_usd = await chat_with_openrouter(
            messages=messages,
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
        )
    else:
        # Default to Ollama
        ollama_url = settings.get("ollama_url") or settings.get("ollama_base_url") or DEFAULT_OLLAMA_URL
        model = model_name or settings.get("ollama_model", DEFAULT_OLLAMA_MODEL)
        response_text, input_tokens, output_tokens = await chat_with_ollama(
            messages=messages,
            ollama_url=ollama_url,
            model=model,
            system_prompt=system_prompt,
        )
        cost_usd = 0.0  # Local Ollama is free

    # Save token usage with cost
    save_token_usage(
        db=db,
        provider=provider,
        model_name=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost=cost_usd,
    )

    return response_text, input_tokens, output_tokens
