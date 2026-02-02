from fastapi import APIRouter

router = APIRouter(prefix="/settings")

@router.get("")
def get_settings():
    return {}

@router.put("")
def update_settings():
    return {"message": "Updated"}
