from fastapi import APIRouter

router = APIRouter(prefix="/dashboard")

@router.get("")
def get_dashboard():
    return {"message": "Dashboard data"}

@router.get("/layout")
def get_layout():
    return {"widgets": []}

@router.put("/layout")
def save_layout(layout: dict):
    return {"message": "Layout saved"}
