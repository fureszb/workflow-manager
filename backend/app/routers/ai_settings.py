from fastapi import APIRouter

router = APIRouter(prefix="/ai")

@router.get("/personality")
def get_personality():
    return {}

@router.put("/personality/{provider}")
def update_personality(provider: str):
    return {"message": "Updated"}

@router.post("/test-connection")
def test_connection():
    return {"message": "Connection OK"}

@router.get("/models/openrouter")
def get_openrouter_models():
    return []

@router.get("/knowledge-log")
def get_knowledge_log():
    return []
