from fastapi import APIRouter

router = APIRouter(prefix="/audit-log")

@router.get("")
def list_audit_logs():
    return []
