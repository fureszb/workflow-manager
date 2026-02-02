from fastapi import APIRouter

router = APIRouter(prefix="/tokens")

@router.get("/usage/daily")
def daily_usage():
    return []

@router.get("/usage/monthly")
def monthly_usage():
    return []

@router.get("/usage/by-model")
def usage_by_model():
    return []

@router.get("/cost")
def get_cost():
    return {}
