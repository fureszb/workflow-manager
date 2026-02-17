"""
Embedding modellek konfigurációja.
Egy helyen van minden modell adata — könnyű bővíteni.
"""

EMBEDDING_MODELS = {
    # ══════════════════════════════════════
    # LOKÁLIS (Ollama)
    # ══════════════════════════════════════
    "ollama": {
        "bge-m3": {
            "name": "BGE-M3",
            "dimension": 1024,
            "description": "Legjobb magyar nyelvű támogatás. Ajánlott!",
            "size": "~1.2 GB",
            "speed": "Közepes",
            "quality_hu": "★★★★★",
            "pull_command": "ollama pull bge-m3",
        },
        "nomic-embed-text": {
            "name": "Nomic Embed Text",
            "dimension": 768,
            "description": "Jó multilingual, gyorsabb.",
            "size": "~530 MB",
            "speed": "Gyors",
            "quality_hu": "★★★★☆",
            "pull_command": "ollama pull nomic-embed-text",
        },
        "snowflake-arctic-embed2": {
            "name": "Snowflake Arctic Embed 2",
            "dimension": 1024,
            "description": "Főleg angolra optimalizált. Magyar: gyenge.",
            "size": "~1.1 GB",
            "speed": "Közepes",
            "quality_hu": "★★☆☆☆",
            "pull_command": "ollama pull snowflake-arctic-embed2",
        },
    },

    # ══════════════════════════════════════
    # API (OpenRouter)
    # ══════════════════════════════════════
    "openrouter": {
        "openai/text-embedding-3-small": {
            "name": "OpenAI Embedding 3 Small",
            "dimension": 1536,
            "description": "Gyors, olcsó, kiváló magyar. ~$0.02 / 1M token.",
            "size": "API",
            "speed": "Nagyon gyors",
            "quality_hu": "★★★★★",
            "price": "~$0.02 / 1M token",
        },
        "openai/text-embedding-3-large": {
            "name": "OpenAI Embedding 3 Large",
            "dimension": 3072,
            "description": "Legjobb minőség, drágabb. ~$0.13 / 1M token.",
            "size": "API",
            "speed": "Gyors",
            "quality_hu": "★★★★★",
            "price": "~$0.13 / 1M token",
        },
    },
}


def get_model_config(provider: str, model: str) -> dict:
    """Modell konfiguráció lekérdezése."""
    return EMBEDDING_MODELS.get(provider, {}).get(model, {})


def get_model_dimension(provider: str, model: str) -> int:
    """Modell embedding dimenziójának lekérdezése."""
    config = get_model_config(provider, model)
    return config.get("dimension", 1024)


def get_available_models(provider: str) -> dict:
    """Elérhető modellek lekérdezése provider-hez."""
    return EMBEDDING_MODELS.get(provider, {})

