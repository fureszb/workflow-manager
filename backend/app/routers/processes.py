from fastapi import APIRouter

router = APIRouter(prefix="/processes")

@router.get("")
def list_processes():
    return []

@router.get("/{process_id}")
def get_process(process_id: int):
    return {"id": process_id}

@router.post("/{process_id}/generate-guide")
def generate_guide(process_id: int):
    return {"message": "Guide generation started"}
