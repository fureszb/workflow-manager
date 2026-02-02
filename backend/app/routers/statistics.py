from fastapi import APIRouter

router = APIRouter(prefix="/statistics")

@router.get("/processes")
def process_stats():
    return {}

@router.get("/emails")
def email_stats():
    return {}

@router.get("/tokens")
def token_stats():
    return {}

@router.post("/export")
def export_stats():
    return {"message": "Exporting"}
