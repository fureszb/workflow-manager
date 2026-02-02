from fastapi import APIRouter

router = APIRouter(prefix="/statuses")

@router.get("")
def list_statuses():
    return []

@router.post("")
def create_status():
    return {"message": "Created"}

@router.put("/{status_id}")
def update_status(status_id: int):
    return {"id": status_id}

@router.delete("/{status_id}")
def delete_status(status_id: int):
    return {"message": "Deleted"}

@router.put("/reorder")
def reorder_statuses():
    return {"message": "Reordered"}
