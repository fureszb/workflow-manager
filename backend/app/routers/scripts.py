from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql import func
from typing import List, Optional, Dict
import os
import uuid
import asyncio
import subprocess
import signal
from datetime import datetime

from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.models.models import PythonScript, ProcessType, ScriptRun
from app.schemas.schemas import (
    PythonScriptCreate,
    PythonScriptUpdate,
    PythonScriptResponse,
    PythonScriptWithRuns,
    ScriptRunResponse,
    ScriptOutputFileResponse,
)
from app.routers.websocket_router import broadcast, broadcast_notification

router = APIRouter(prefix="/scripts")

# Ensure scripts directory exists
os.makedirs(settings.SCRIPTS_DIR, exist_ok=True)
os.makedirs(settings.SCRIPT_OUTPUTS_DIR, exist_ok=True)

# Store running processes: {run_id: subprocess.Popen}
running_processes: Dict[int, subprocess.Popen] = {}


@router.get("", response_model=List[PythonScriptResponse])
def list_scripts(
    process_type_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """List all registered scripts with optional filtering by process type."""
    query = db.query(PythonScript).options(joinedload(PythonScript.process_type))

    if process_type_id is not None:
        query = query.filter(PythonScript.process_type_id == process_type_id)

    return query.order_by(PythonScript.created_at.desc()).all()


@router.post("", response_model=PythonScriptResponse, status_code=201)
async def create_script(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    file_path: Optional[str] = Form(None),
    process_type_id: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Register a new script.

    Two modes of registration:
    1. Server path: Provide file_path to an existing .py file on the server
    2. File upload: Upload a .py file which will be stored in /storage/scripts/

    Either file_path or file must be provided, but not both.
    """
    # Validate: either file_path or file upload must be provided
    if not file_path and not file:
        raise HTTPException(
            status_code=400,
            detail="Vagy a szerveren lévő fájl útvonalát, vagy egy fájlt kell megadni"
        )

    if file_path and file:
        raise HTTPException(
            status_code=400,
            detail="Csak az egyik adható meg: fájl útvonal vagy fájl feltöltés"
        )

    is_uploaded = False
    final_path = file_path

    if file:
        # Validate file extension
        if not file.filename or not file.filename.endswith('.py'):
            raise HTTPException(
                status_code=400,
                detail="Csak .py fájlok tölthetők fel"
            )

        # Generate unique filename to avoid collisions
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        final_path = os.path.join(settings.SCRIPTS_DIR, unique_filename)

        # Save uploaded file
        content = await file.read()
        with open(final_path, "wb") as f:
            f.write(content)

        is_uploaded = True
    else:
        # Validate server path exists and is a .py file
        if not final_path.endswith('.py'):
            raise HTTPException(
                status_code=400,
                detail="Csak .py fájlok regisztrálhatók"
            )

        if not os.path.exists(final_path):
            raise HTTPException(
                status_code=400,
                detail=f"A megadott fájl nem található: {final_path}"
            )

    # Validate process_type_id if provided
    if process_type_id:
        process_type = db.query(ProcessType).filter(ProcessType.id == process_type_id).first()
        if not process_type:
            raise HTTPException(
                status_code=400,
                detail=f"Folyamat típus nem található: {process_type_id}"
            )

    # Create script record
    script = PythonScript(
        name=name,
        description=description,
        file_path=final_path,
        process_type_id=process_type_id,
        is_uploaded=is_uploaded,
    )
    db.add(script)
    db.commit()
    db.refresh(script)

    # Load relationship for response
    db.refresh(script, ["process_type"])

    return script


@router.get("/{script_id}", response_model=PythonScriptWithRuns)
def get_script(script_id: int, db: Session = Depends(get_db)):
    """Get script details including run history."""
    script = db.query(PythonScript).options(
        joinedload(PythonScript.process_type),
        joinedload(PythonScript.runs)
    ).filter(PythonScript.id == script_id).first()

    if not script:
        raise HTTPException(status_code=404, detail="Script nem található")

    return script


@router.put("/{script_id}", response_model=PythonScriptResponse)
def update_script(
    script_id: int,
    payload: PythonScriptUpdate,
    db: Session = Depends(get_db),
):
    """Update script metadata (name, description, process_type_id)."""
    script = db.query(PythonScript).filter(PythonScript.id == script_id).first()

    if not script:
        raise HTTPException(status_code=404, detail="Script nem található")

    # Validate process_type_id if provided
    if payload.process_type_id is not None:
        if payload.process_type_id != 0:  # 0 means unassign
            process_type = db.query(ProcessType).filter(
                ProcessType.id == payload.process_type_id
            ).first()
            if not process_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Folyamat típus nem található: {payload.process_type_id}"
                )
        else:
            # Unassign process type
            payload.process_type_id = None

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(script, key, value)

    db.commit()
    db.refresh(script)
    db.refresh(script, ["process_type"])

    return script


@router.delete("/{script_id}")
def delete_script(script_id: int, db: Session = Depends(get_db)):
    """Delete a script.

    If the script was uploaded (is_uploaded=True), the file is also deleted from disk.
    """
    script = db.query(PythonScript).filter(PythonScript.id == script_id).first()

    if not script:
        raise HTTPException(status_code=404, detail="Script nem található")

    # Delete uploaded file from disk if applicable
    if script.is_uploaded and script.file_path and os.path.exists(script.file_path):
        os.remove(script.file_path)

    # Delete from database (cascade will delete runs)
    db.delete(script)
    db.commit()

    return {"message": "Script törölve"}


@router.get("/process-types/list")
def list_process_types(db: Session = Depends(get_db)):
    """List all active process types for script assignment dropdown."""
    process_types = db.query(ProcessType).filter(
        ProcessType.is_active == True
    ).order_by(ProcessType.order, ProcessType.name).all()

    return [
        {"id": pt.id, "name": pt.name}
        for pt in process_types
    ]


async def run_script_async(run_id: int, script_path: str, script_id: int, script_name: str = "Script"):
    """Run a Python script asynchronously with real-time output streaming via WebSocket."""
    db = SessionLocal()
    stdout_buffer = []
    stderr_buffer = []

    # Create output directory for this run
    output_dir = os.path.join(settings.SCRIPT_OUTPUTS_DIR, str(run_id))
    os.makedirs(output_dir, exist_ok=True)

    try:
        # Broadcast status: running
        await broadcast("script.status", {
            "run_id": run_id,
            "script_id": script_id,
            "status": "running",
        })

        # Prepare environment with output directory
        env = os.environ.copy()
        env["SCRIPT_OUTPUT_DIR"] = output_dir

        # Start the subprocess
        process = await asyncio.create_subprocess_exec(
            "python", script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.dirname(script_path) if os.path.dirname(script_path) else None,
            env=env,
        )

        # Store process reference for cancellation (use pid as key since Popen isn't available here)
        running_processes[run_id] = process

        async def stream_output(stream, stream_type: str):
            """Stream output line by line via WebSocket."""
            buffer = stdout_buffer if stream_type == "stdout" else stderr_buffer
            while True:
                line = await stream.readline()
                if not line:
                    break
                line_text = line.decode("utf-8", errors="replace")
                buffer.append(line_text)
                await broadcast("script.output", {
                    "run_id": run_id,
                    "script_id": script_id,
                    "stream": stream_type,
                    "line": line_text,
                })

        # Stream both stdout and stderr concurrently
        await asyncio.gather(
            stream_output(process.stdout, "stdout"),
            stream_output(process.stderr, "stderr"),
        )

        # Wait for process to complete
        exit_code = await process.wait()

        # Determine final status
        if exit_code == 0:
            final_status = "success"
        elif exit_code == -signal.SIGTERM or exit_code == -signal.SIGKILL:
            final_status = "cancelled"
        else:
            final_status = "failed"

        # Update database record
        script_run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
        if script_run:
            script_run.status = final_status
            script_run.stdout = "".join(stdout_buffer)
            script_run.stderr = "".join(stderr_buffer)
            script_run.exit_code = exit_code
            script_run.completed_at = datetime.utcnow()
            db.commit()

        # Broadcast status change
        await broadcast("script.status", {
            "run_id": run_id,
            "script_id": script_id,
            "status": final_status,
            "exit_code": exit_code,
        })

        # Send user notification
        if final_status == "success":
            await broadcast_notification(
                message=f"Script '{script_name}' sikeresen lefutott",
                level="success",
                title="Script futás kész",
                action_url="/scripts"
            )
        elif final_status == "failed":
            await broadcast_notification(
                message=f"Script '{script_name}' hiba kóddal zárt: {exit_code}",
                level="error",
                title="Script hiba",
                action_url="/scripts"
            )

    except asyncio.CancelledError:
        # Handle cancellation
        script_run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
        if script_run:
            script_run.status = "cancelled"
            script_run.stdout = "".join(stdout_buffer)
            script_run.stderr = "".join(stderr_buffer)
            script_run.completed_at = datetime.utcnow()
            db.commit()

        await broadcast("script.status", {
            "run_id": run_id,
            "script_id": script_id,
            "status": "cancelled",
        })
        raise

    except Exception as e:
        # Handle errors
        script_run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
        if script_run:
            script_run.status = "failed"
            script_run.stdout = "".join(stdout_buffer)
            script_run.stderr = "".join(stderr_buffer) + f"\n\nError: {str(e)}"
            script_run.completed_at = datetime.utcnow()
            db.commit()

        await broadcast("script.status", {
            "run_id": run_id,
            "script_id": script_id,
            "status": "failed",
            "error": str(e),
        })

    finally:
        # Cleanup
        if run_id in running_processes:
            del running_processes[run_id]
        db.close()


@router.post("/{script_id}/run", response_model=ScriptRunResponse, status_code=201)
async def run_script(
    script_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Run a Python script.

    Creates a ScriptRun record and starts the script execution in the background.
    Real-time output is streamed via WebSocket (script.output event).
    Status changes are broadcast via WebSocket (script.status event).
    """
    # Get the script
    script = db.query(PythonScript).filter(PythonScript.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script nem található")

    # Verify script file exists
    if not os.path.exists(script.file_path):
        raise HTTPException(
            status_code=400,
            detail=f"A script fájl nem található: {script.file_path}"
        )

    # Create a new ScriptRun record
    script_run = ScriptRun(
        script_id=script_id,
        status="running",
    )
    db.add(script_run)
    db.commit()
    db.refresh(script_run)

    # Start the script execution in the background
    asyncio.create_task(run_script_async(script_run.id, script.file_path, script_id, script.name))

    return script_run


@router.post("/{script_id}/cancel")
async def cancel_script(
    script_id: int,
    run_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Cancel a running script.

    If run_id is provided, cancel that specific run.
    Otherwise, cancel the most recent running instance of the script.
    """
    # Get the script (to verify it exists)
    script = db.query(PythonScript).filter(PythonScript.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script nem található")

    # Find the run to cancel
    if run_id:
        script_run = db.query(ScriptRun).filter(
            ScriptRun.id == run_id,
            ScriptRun.script_id == script_id,
            ScriptRun.status == "running"
        ).first()
    else:
        # Get the most recent running instance
        script_run = db.query(ScriptRun).filter(
            ScriptRun.script_id == script_id,
            ScriptRun.status == "running"
        ).order_by(ScriptRun.started_at.desc()).first()

    if not script_run:
        raise HTTPException(status_code=404, detail="Nincs futó script példány")

    # Try to terminate the process
    if script_run.id in running_processes:
        process = running_processes[script_run.id]
        try:
            process.terminate()
            # Give it a moment to terminate gracefully
            try:
                await asyncio.wait_for(process.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                # Force kill if it doesn't terminate
                process.kill()
        except ProcessLookupError:
            # Process already terminated
            pass

    # Update the run status
    script_run.status = "cancelled"
    script_run.completed_at = datetime.utcnow()
    db.commit()

    # Broadcast status change
    await broadcast("script.status", {
        "run_id": script_run.id,
        "script_id": script_id,
        "status": "cancelled",
    })

    return {"message": "Script leállítva", "run_id": script_run.id}


@router.get("/{script_id}/runs", response_model=List[ScriptRunResponse])
def get_script_runs(
    script_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Get recent runs for a script."""
    script = db.query(PythonScript).filter(PythonScript.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script nem található")

    runs = db.query(ScriptRun).filter(
        ScriptRun.script_id == script_id
    ).order_by(ScriptRun.started_at.desc()).limit(limit).all()

    return runs


@router.get("/runs/{run_id}", response_model=ScriptRunResponse)
def get_run_details(run_id: int, db: Session = Depends(get_db)):
    """Get details of a specific script run."""
    run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Futtatás nem található")

    return run


@router.get("/runs/{run_id}/output-files", response_model=List[ScriptOutputFileResponse])
def get_run_output_files(run_id: int, db: Session = Depends(get_db)):
    """Get output files generated by a specific script run."""
    run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Futtatás nem található")

    output_dir = os.path.join(settings.SCRIPT_OUTPUTS_DIR, str(run_id))
    files = []

    if os.path.exists(output_dir):
        for filename in os.listdir(output_dir):
            file_path = os.path.join(output_dir, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "file_path": file_path,
                    "file_size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_ctime),
                })

    # Sort by created_at descending
    files.sort(key=lambda x: x["created_at"], reverse=True)

    return files


@router.get("/runs/{run_id}/output-files/{filename}")
def download_output_file(run_id: int, filename: str, db: Session = Depends(get_db)):
    """Download a specific output file from a script run."""
    run = db.query(ScriptRun).filter(ScriptRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Futtatás nem található")

    output_dir = os.path.join(settings.SCRIPT_OUTPUTS_DIR, str(run_id))
    file_path = os.path.join(output_dir, filename)

    # Security: ensure the file is within the output directory
    real_output_dir = os.path.realpath(output_dir)
    real_file_path = os.path.realpath(file_path)
    if not real_file_path.startswith(real_output_dir):
        raise HTTPException(status_code=400, detail="Érvénytelen fájl elérési út")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fájl nem található")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )
