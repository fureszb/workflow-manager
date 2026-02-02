from fastapi import APIRouter

router = APIRouter(prefix="/chat")

@router.get("/conversations")
def list_conversations():
    return []

@router.post("/conversations")
def create_conversation():
    return {"message": "Created"}

@router.get("/conversations/{conv_id}")
def get_conversation(conv_id: int):
    return {"id": conv_id}

@router.post("/conversations/{conv_id}/message")
def send_message(conv_id: int):
    return {"message": "Sent"}

@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: int):
    return {"message": "Deleted"}
