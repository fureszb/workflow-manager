from fastapi import APIRouter

router = APIRouter(prefix="/scripts")

@router.get("")
def list_scripts():
    return []

@router.post("")
def create_script():
    return {"message": "Created"}

@router.put("/{script_id}")
def update_script(script_id: int):
    return {"id": script_id}

@router.delete("/{script_id}")
def delete_script(script_id: int):
    return {"message": "Deleted"}

@router.post("/{script_id}/run")
def run_script(script_id: int):
    return {"message": "Running"}

@router.post("/{script_id}/cancel")
def cancel_script(script_id: int):
    return {"message": "Cancelled"}

@router.get("/{script_id}/runs")
def list_runs(script_id: int):
    return []

@router.get("/runs/{run_id}")
def get_run(run_id: int):
    return {"id": run_id}

@router.get("/runs/{run_id}/output-files")
def get_output_files(run_id: int):
    return []
