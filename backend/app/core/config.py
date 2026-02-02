from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://testuser:1122@localhost:3306/workflow_manager"
    SECRET_KEY: str = "workflow-manager-secret-key-change-in-production"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "ajindal/llama3.1-storm:8b-q4_k_m"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    UPLOAD_DIR: str = str(Path(__file__).resolve().parent.parent.parent.parent / "storage" / "uploads")
    KNOWLEDGE_DIR: str = str(Path(__file__).resolve().parent.parent.parent.parent / "storage" / "knowledge")
    SCRIPTS_DIR: str = str(Path(__file__).resolve().parent.parent.parent.parent / "storage" / "scripts")
    FAISS_INDEX_DIR: str = str(Path(__file__).resolve().parent.parent.parent.parent / "storage" / "faiss_index")

    MAX_FILE_VERSIONS: int = 2
    AUDIT_LOG_RETENTION_DAYS: int = 365
    CHAT_CONTEXT_SIZE: int = 20

    class Config:
        env_file = ".env"


settings = Settings()
