from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://testuser:1122@localhost:3306/workflow_manager"
    secret_key: str = "workflow-manager-secret-key"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "ajindal/llama3.1-storm:8b-q4_k_m"
    openrouter_api_key: str = ""
    openrouter_default_model: str = ""
    storage_path: str = "/home/bencelinux/workflow-manager/storage"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

@lru_cache()
def get_settings():
    return Settings()
