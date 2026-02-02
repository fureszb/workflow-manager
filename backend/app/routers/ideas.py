from fastapi import APIRouter

router = APIRouter(prefix="/ideas")

@router.get("")
def list_ideas():
    return []

@router.post("")
def create_idea():
    return {"message": "Created"}

@router.put("/{idea_id}")
def update_idea(idea_id: int):
    return {"id": idea_id}

@router.delete("/{idea_id}")
def delete_idea(idea_id: int):
    return {"message": "Deleted"}

@router.post("/generate")
def generate_ideas():
    return {"message": "Generating"}
