from fastapi import APIRouter

router = APIRouter(prefix="/emails")

@router.get("")
def list_emails():
    return []

@router.get("/{email_id}")
def get_email(email_id: int):
    return {"id": email_id}

@router.post("/import-pst")
def import_pst():
    return {"message": "Import started"}

@router.post("/auto-categorize")
def auto_categorize():
    return {"message": "Categorizing"}

@router.post("/auto-link")
def auto_link():
    return {"message": "Linking"}

@router.post("/{email_id}/link-task")
def link_task(email_id: int):
    return {"message": "Linked"}

@router.delete("/{email_id}/unlink-task/{task_id}")
def unlink_task(email_id: int, task_id: int):
    return {"message": "Unlinked"}
