from fastapi import APIRouter

router = APIRouter(prefix="/monthly-tasks")

@router.get("")
def list_monthly_tasks(year: int = None, month: int = None):
    return []

@router.get("/{task_id}")
def get_monthly_task(task_id: int):
    return {"id": task_id}

@router.put("/{task_id}")
def update_monthly_task(task_id: int):
    return {"id": task_id}

@router.post("/generate")
def generate_monthly_tasks():
    return {"message": "Tasks generated"}
