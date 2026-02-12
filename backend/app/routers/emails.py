import os
import uuid
import asyncio
import json
import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session

from fastapi.responses import FileResponse
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Email, EmailAttachment, EmailTaskLink, AppSetting, ProcessInstance, ProcessType
from app.schemas.schemas import (
    EmailResponse,
    EmailWithAttachments,
    PSTImportResult,
    EmailCategorizationResult,
    EmailCategorizationItem,
    EmailImportanceUpdate,
    EmailTaskLinkCreate,
    EmailTaskLinkResponse,
    EmailTaskLinkBrief,
    EmailAutoLinkItem,
    EmailAutoLinkResult,
)
from app.routers.websocket_router import broadcast, broadcast_notification
from app.services.ai_service import send_chat_message

router = APIRouter(prefix="/emails")


@router.get("", response_model=List[EmailResponse])
def list_emails(
    skip: int = 0,
    limit: int = 100,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    importance: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all emails with pagination and filtering."""
    query = db.query(Email)

    # Date range filter
    if date_from:
        query = query.filter(Email.received_date >= date_from)
    if date_to:
        query = query.filter(Email.received_date <= date_to)

    # Importance filter
    if importance:
        query = query.filter(Email.importance == importance)

    # Category filter
    if category:
        query = query.filter(Email.category == category)

    # Search filter (searches subject, sender, body)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Email.subject.ilike(search_term)) |
            (Email.sender.ilike(search_term)) |
            (Email.body.ilike(search_term))
        )

    emails = query.order_by(Email.received_date.desc()).offset(skip).limit(limit).all()
    return emails


@router.get("/{email_id}", response_model=EmailWithAttachments)
def get_email(email_id: int, db: Session = Depends(get_db)):
    """Get a single email with its attachments and task links."""
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # Build task_links with process names
    task_links_with_names = []
    for link in email.task_links:
        task = db.query(ProcessInstance).filter(ProcessInstance.id == link.process_instance_id).first()
        process_name = None
        if task:
            process_type = db.query(ProcessType).filter(ProcessType.id == task.process_type_id).first()
            if process_type:
                process_name = f"{process_type.name} ({task.year}/{task.month:02d})"

        task_links_with_names.append(EmailTaskLinkBrief(
            id=link.id,
            process_instance_id=link.process_instance_id,
            process_name=process_name,
            ai_confidence=link.ai_confidence,
            created_at=link.created_at
        ))

    # Create response with task_links
    response_data = {
        "id": email.id,
        "message_id": email.message_id,
        "subject": email.subject,
        "sender": email.sender,
        "recipients": email.recipients,
        "body": email.body,
        "received_date": email.received_date,
        "importance": email.importance,
        "category": email.category,
        "is_read": email.is_read,
        "process_instance_id": email.process_instance_id,
        "ai_category": email.ai_category,
        "ai_summary": email.ai_summary,
        "ai_importance_reason": email.ai_importance_reason,
        "created_at": email.created_at,
        "attachments": email.attachments,
        "task_links": task_links_with_names,
    }

    return EmailWithAttachments(**response_data)


@router.get("/available-tasks", response_model=List[dict])
def list_available_tasks(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """List available tasks for email linking dropdown.

    Returns process instances with their process type names.
    Defaults to current month if year/month not specified.
    """
    from datetime import datetime

    if year is None or month is None:
        now = datetime.now()
        year = year or now.year
        month = month or now.month

    tasks = db.query(ProcessInstance).filter(
        ProcessInstance.year == year,
        ProcessInstance.month == month
    ).all()

    result = []
    for task in tasks:
        process_type = db.query(ProcessType).filter(ProcessType.id == task.process_type_id).first()
        if process_type:
            result.append({
                "id": task.id,
                "name": process_type.name,
                "full_name": f"{process_type.name} ({year}/{month:02d})",
                "year": year,
                "month": month,
            })

    return result


@router.put("/{email_id}/importance", response_model=EmailResponse)
def update_email_importance(
    email_id: int,
    update: EmailImportanceUpdate,
    db: Session = Depends(get_db)
):
    """Manually update email importance level.

    This allows users to override the AI-assigned importance level.
    Valid importance values: Kritikus, Magas, Közepes, Alacsony
    """
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    valid_importance = ["Kritikus", "Magas", "Közepes", "Alacsony"]
    if update.importance not in valid_importance:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid importance level. Valid values: {', '.join(valid_importance)}"
        )

    email.importance = update.importance
    if update.ai_importance_reason is not None:
        email.ai_importance_reason = update.ai_importance_reason

    db.commit()
    db.refresh(email)
    return email


@router.get("/{email_id}/attachments/{attachment_id}/download")
def download_attachment(email_id: int, attachment_id: int, db: Session = Depends(get_db)):
    """Download an email attachment."""
    attachment = db.query(EmailAttachment).filter(
        EmailAttachment.id == attachment_id,
        EmailAttachment.email_id == email_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not attachment.file_path or not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="Attachment file not found")

    return FileResponse(
        path=attachment.file_path,
        filename=attachment.filename,
        media_type=attachment.content_type or "application/octet-stream"
    )


async def send_progress(event_type: str, data: dict):
    """Helper to send progress updates."""
    try:
        await broadcast(event_type, data)
    except Exception:
        pass  # Ignore broadcast errors


def extract_message_id_from_headers(headers: str) -> Optional[str]:
    """Extract Message-ID from email headers."""
    if not headers:
        return None
    for line in headers.split('\n'):
        if line.lower().startswith('message-id:'):
            return line.split(':', 1)[1].strip()
    return None


def process_pst_message(message, db: Session) -> dict:
    """Process a single PST message and return result info."""
    result = {"imported": False, "skipped": False, "error": None, "subject": ""}

    try:
        # Get message ID for deduplication
        message_id = None
        try:
            headers = message.get_transport_headers()
            message_id = extract_message_id_from_headers(headers)
        except Exception:
            pass

        # Generate a unique ID if none found
        if not message_id:
            message_id = f"pst-import-{uuid.uuid4()}"

        # Check for duplicates
        existing = db.query(Email).filter(Email.message_id == message_id).first()
        if existing:
            result["skipped"] = True
            result["subject"] = message.subject or "(no subject)"
            return result

        # Extract email data
        subject = message.subject or ""
        result["subject"] = subject

        sender = ""
        try:
            sender = message.sender_name or ""
            if message.sender_email_address:
                sender = f"{sender} <{message.sender_email_address}>" if sender else message.sender_email_address
        except Exception:
            pass

        recipients = ""
        try:
            recipient_list = []
            for j in range(message.get_number_of_recipients()):
                recipient = message.get_recipient(j)
                if recipient:
                    name = recipient.name or ""
                    email_addr = recipient.email_address or ""
                    if name and email_addr:
                        recipient_list.append(f"{name} <{email_addr}>")
                    elif email_addr:
                        recipient_list.append(email_addr)
                    elif name:
                        recipient_list.append(name)
            recipients = ", ".join(recipient_list)
        except Exception:
            pass

        body = ""
        try:
            body = message.plain_text_body or ""
            if not body:
                body = message.html_body or ""
        except Exception:
            pass

        received_date = None
        try:
            received_date = message.delivery_time
        except Exception:
            pass

        # Create email record
        email = Email(
            message_id=message_id,
            subject=subject[:1000] if subject else None,
            sender=sender[:500] if sender else None,
            recipients=recipients if recipients else None,
            body=body if body else None,
            received_date=received_date,
            importance="Közepes",
            is_read=False,
        )
        db.add(email)
        db.flush()

        # Process attachments
        try:
            for k in range(message.get_number_of_attachments()):
                attachment = message.get_attachment(k)
                if attachment:
                    filename = attachment.name or f"attachment_{k}"
                    # Sanitize filename
                    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
                    if not safe_filename:
                        safe_filename = f"attachment_{k}"

                    # Create unique filepath
                    unique_name = f"{uuid.uuid4()}_{safe_filename}"
                    file_path = os.path.join(settings.EMAIL_ATTACHMENTS_DIR, unique_name)

                    # Save attachment
                    try:
                        data = attachment.read_buffer(attachment.get_size())
                        if data:
                            with open(file_path, 'wb') as f:
                                f.write(data)

                            # Create attachment record
                            email_attachment = EmailAttachment(
                                email_id=email.id,
                                filename=filename[:500],
                                file_path=file_path,
                                file_size=len(data),
                                content_type=attachment.mime_type or "application/octet-stream"
                            )
                            db.add(email_attachment)
                    except Exception as e:
                        result["error"] = f"Attachment error for '{filename}': {str(e)}"
        except Exception as e:
            result["error"] = f"Attachment processing error: {str(e)}"

        result["imported"] = True

    except Exception as e:
        result["error"] = f"Message processing error: {str(e)}"

    return result


def collect_messages_from_folder(folder) -> list:
    """Recursively collect all messages from a folder and its subfolders."""
    messages = []

    # Get messages from current folder
    for i in range(folder.get_number_of_sub_messages()):
        messages.append(folder.get_sub_message(i))

    # Get messages from subfolders
    for i in range(folder.get_number_of_sub_folders()):
        messages.extend(collect_messages_from_folder(folder.get_sub_folder(i)))

    return messages


async def process_pst_file(pst_path: str, db: Session) -> PSTImportResult:
    """Process a PST file and import emails with deduplication."""
    try:
        import pypff
    except ImportError:
        return PSTImportResult(
            success=False,
            total_emails=0,
            imported=0,
            skipped=0,
            errors=["pypff library not installed"]
        )

    result = {
        "total": 0,
        "imported": 0,
        "skipped": 0,
        "errors": []
    }

    # Ensure email attachments directory exists
    os.makedirs(settings.EMAIL_ATTACHMENTS_DIR, exist_ok=True)

    try:
        pst_file = pypff.file()
        pst_file.open(pst_path)

        # Get root folder
        root = pst_file.get_root_folder()

        # Collect all messages first
        all_messages = collect_messages_from_folder(root)
        total_emails = len(all_messages)
        result["total"] = total_emails

        # Broadcast initial progress
        await send_progress("pst_import.progress", {
            "status": "processing",
            "current": 0,
            "total": total_emails,
            "imported": 0,
            "skipped": 0,
            "message": "Starting import..."
        })

        # Process each message
        for idx, message in enumerate(all_messages):
            msg_result = process_pst_message(message, db)

            if msg_result["imported"]:
                result["imported"] += 1
            elif msg_result["skipped"]:
                result["skipped"] += 1

            if msg_result["error"]:
                result["errors"].append(msg_result["error"])

            # Broadcast progress every 10 emails or on skip
            if (idx + 1) % 10 == 0 or msg_result["skipped"]:
                status_msg = f"Skipped duplicate: {msg_result['subject'][:50]}" if msg_result["skipped"] else f"Importing: {msg_result['subject'][:50]}..."
                await send_progress("pst_import.progress", {
                    "status": "processing",
                    "current": idx + 1,
                    "total": total_emails,
                    "imported": result["imported"],
                    "skipped": result["skipped"],
                    "message": status_msg
                })

            # Yield control periodically
            if (idx + 1) % 50 == 0:
                await asyncio.sleep(0)

        pst_file.close()
        db.commit()

        # Broadcast completion
        await send_progress("pst_import.progress", {
            "status": "completed",
            "current": total_emails,
            "total": total_emails,
            "imported": result["imported"],
            "skipped": result["skipped"],
            "message": f"Import completed: {result['imported']} imported, {result['skipped']} skipped"
        })

        # Send notification for PST import completion
        if result["imported"] > 0:
            await broadcast_notification(
                message=f"PST import kész: {result['imported']} email importálva",
                level="success",
                title="PST Import kész",
                action_url="/emails"
            )

    except Exception as e:
        db.rollback()
        result["errors"].append(f"PST processing error: {str(e)}")
        await send_progress("pst_import.progress", {
            "status": "error",
            "current": 0,
            "total": 0,
            "imported": 0,
            "skipped": 0,
            "message": f"Error: {str(e)}"
        })

        # Send error notification
        await broadcast_notification(
            message=f"PST import hiba: {str(e)[:100]}",
            level="error",
            title="PST Import hiba"
        )

    # Clean up uploaded PST file
    try:
        os.remove(pst_path)
    except Exception:
        pass

    return PSTImportResult(
        success=len(result["errors"]) == 0,
        total_emails=result["total"],
        imported=result["imported"],
        skipped=result["skipped"],
        errors=result["errors"][:10]  # Limit error messages
    )


def get_email_auto_categorize_setting(db: Session) -> bool:
    """Check if email auto-categorization is enabled."""
    setting = db.query(AppSetting).filter(AppSetting.key == "email_auto_categorize").first()
    return setting.value == "true" if setting else False


@router.post("/import-pst", response_model=PSTImportResult)
async def import_pst(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Import emails from a PST file with duplicate detection."""
    if not file.filename.lower().endswith('.pst'):
        raise HTTPException(status_code=400, detail="Only PST files are accepted")

    # Save uploaded file temporarily
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_path = os.path.join(settings.UPLOAD_DIR, f"pst_import_{uuid.uuid4()}.pst")

    try:
        content = await file.read()
        with open(temp_path, 'wb') as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Process the PST file
    result = await process_pst_file(temp_path, db)

    # Check if auto-categorization is enabled and we imported emails
    if result.imported > 0 and get_email_auto_categorize_setting(db):
        # Trigger auto-categorization for newly imported emails
        await send_progress("pst_import.progress", {
            "status": "categorizing",
            "current": result.total_emails,
            "total": result.total_emails,
            "imported": result.imported,
            "skipped": result.skipped,
            "message": "Automatikus AI kategorizálás indítása..."
        })
        # Call auto-categorize for uncategorized emails
        await auto_categorize(email_ids=None, db=db)

    return result


IMPORTANCE_LEVELS = ["Kritikus", "Magas", "Közepes", "Alacsony"]


def parse_ai_categorization_response(response_text: str) -> tuple[str, str]:
    """Parse AI response to extract importance level and reason.

    Returns:
        Tuple of (importance, reason)
    """
    importance = "Közepes"  # Default
    reason = response_text.strip()

    # Try to parse JSON format first
    try:
        # Look for JSON in the response
        json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            if "importance" in data or "fontosság" in data or "fontossag" in data:
                imp = data.get("importance") or data.get("fontosság") or data.get("fontossag", "")
                if imp:
                    # Normalize to Hungarian importance levels
                    imp_lower = imp.lower()
                    if "kritikus" in imp_lower or "critical" in imp_lower:
                        importance = "Kritikus"
                    elif "magas" in imp_lower or "high" in imp_lower:
                        importance = "Magas"
                    elif "közepes" in imp_lower or "kozepes" in imp_lower or "medium" in imp_lower:
                        importance = "Közepes"
                    elif "alacsony" in imp_lower or "low" in imp_lower:
                        importance = "Alacsony"
            if "reason" in data or "indok" in data or "indoklás" in data or "indoklas" in data:
                reason = data.get("reason") or data.get("indok") or data.get("indoklás") or data.get("indoklas", reason)
            return importance, reason
    except (json.JSONDecodeError, AttributeError):
        pass

    # Try to extract from plain text
    response_lower = response_text.lower()
    for level in IMPORTANCE_LEVELS:
        if level.lower() in response_lower:
            importance = level
            break

    return importance, reason


@router.post("/auto-categorize", response_model=EmailCategorizationResult)
async def auto_categorize(
    email_ids: Optional[List[int]] = Query(None, description="Specific email IDs to categorize. If not provided, categorizes all uncategorized emails."),
    db: Session = Depends(get_db)
):
    """Auto-categorize email importance using AI.

    The AI analyzes email content and assigns importance levels:
    - Kritikus: Critical/urgent emails requiring immediate action
    - Magas: High priority emails
    - Közepes: Medium/normal priority emails
    - Alacsony: Low priority emails

    Each categorization includes an AI-generated reason explaining the decision.
    """
    result = {
        "success": True,
        "total_processed": 0,
        "categorized": 0,
        "errors": [],
        "results": []
    }

    # Get emails to categorize
    query = db.query(Email)
    if email_ids:
        query = query.filter(Email.id.in_(email_ids))
    else:
        # Only categorize emails without AI importance reason (uncategorized)
        query = query.filter(Email.ai_importance_reason.is_(None))

    emails = query.limit(50).all()  # Limit to 50 emails per batch
    result["total_processed"] = len(emails)

    if not emails:
        return EmailCategorizationResult(**result)

    # Broadcast start
    await send_progress("email_categorization.progress", {
        "status": "processing",
        "current": 0,
        "total": len(emails),
        "message": "AI kategorizálás indítása..."
    })

    system_prompt = """Te egy email elemző asszisztens vagy. A feladatod az email tartalom alapján meghatározni a fontossági szintet.

Fontossági szintek:
- Kritikus: Sürgős, azonnali beavatkozást igényel (pl. határidők, kritikus hibák, sürgős kérések)
- Magas: Fontos, de nem sürgős (pl. fontos projektek, döntések, vezetői kommunikáció)
- Közepes: Normál prioritású emailek (pl. rutin kommunikáció, információk)
- Alacsony: Nem sürgős (pl. hírlevelek, tájékoztatók, promóciók)

Válaszolj CSAK JSON formátumban:
{"importance": "SZINT", "reason": "Rövid indoklás magyarul"}"""

    for idx, email in enumerate(emails):
        try:
            # Build email content for AI
            email_content = f"""Tárgy: {email.subject or '(Nincs tárgy)'}
Feladó: {email.sender or 'Ismeretlen'}
Tartalom: {(email.body or '')[:2000]}"""  # Limit body length

            messages = [{"role": "user", "content": email_content}]

            # Call AI service
            response_text, _, _ = await send_chat_message(
                messages=messages,
                db=db,
                system_prompt=system_prompt
            )

            # Parse response
            importance, reason = parse_ai_categorization_response(response_text)

            # Update email
            email.importance = importance
            email.ai_importance_reason = reason
            db.commit()

            result["categorized"] += 1
            result["results"].append(EmailCategorizationItem(
                email_id=email.id,
                importance=importance,
                ai_importance_reason=reason
            ))

            # Broadcast progress
            await send_progress("email_categorization.progress", {
                "status": "processing",
                "current": idx + 1,
                "total": len(emails),
                "message": f"Feldolgozva: {email.subject[:50] if email.subject else '(Nincs tárgy)'}..."
            })

            # Yield control
            if (idx + 1) % 5 == 0:
                await asyncio.sleep(0)

        except Exception as e:
            error_msg = f"Hiba az email ({email.id}) kategorizálásakor: {str(e)}"
            result["errors"].append(error_msg)

    # Broadcast completion
    await send_progress("email_categorization.progress", {
        "status": "completed",
        "current": len(emails),
        "total": len(emails),
        "message": f"Kategorizálás befejezve: {result['categorized']} email feldolgozva"
    })

    result["success"] = len(result["errors"]) == 0
    return EmailCategorizationResult(**result)


def get_email_auto_link_mode_setting(db: Session) -> str:
    """Get email auto-link mode setting. Returns 'auto' or 'approval'."""
    setting = db.query(AppSetting).filter(AppSetting.key == "email_auto_link_mode").first()
    return setting.value if setting and setting.value in ("auto", "approval") else "approval"


def parse_ai_link_response(response_text: str, available_tasks: list) -> tuple[int | None, float, str]:
    """Parse AI response to extract task ID, confidence score, and reason.

    Returns:
        Tuple of (process_instance_id, confidence, reason)
    """
    process_instance_id = None
    confidence = 0.0
    reason = response_text.strip()

    # Create a mapping of task names to IDs
    task_map = {task["name"].lower(): task["id"] for task in available_tasks}

    # Try to parse JSON format first
    try:
        json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())

            # Get task name or ID
            task_name = data.get("task_name") or data.get("feladat") or data.get("process") or ""
            task_id = data.get("task_id") or data.get("process_instance_id")

            if task_id and isinstance(task_id, int):
                # Verify task ID exists in available tasks
                if any(t["id"] == task_id for t in available_tasks):
                    process_instance_id = task_id
            elif task_name:
                # Match by name
                task_name_lower = task_name.lower()
                for name, tid in task_map.items():
                    if task_name_lower in name or name in task_name_lower:
                        process_instance_id = tid
                        break

            # Get confidence
            conf = data.get("confidence") or data.get("bizonyosság") or data.get("bizonyossag") or 0.0
            if isinstance(conf, (int, float)):
                confidence = float(conf)
                if confidence > 1:
                    confidence = confidence / 100.0  # Convert percentage to 0-1
                confidence = max(0.0, min(1.0, confidence))

            # Get reason
            reason = data.get("reason") or data.get("indok") or data.get("indoklás") or reason

            return process_instance_id, confidence, reason
    except (json.JSONDecodeError, AttributeError):
        pass

    # Try to find task name in plain text
    response_lower = response_text.lower()
    for name, tid in task_map.items():
        if name in response_lower:
            process_instance_id = tid
            confidence = 0.3  # Low confidence for plain text match
            break

    return process_instance_id, confidence, reason


@router.post("/auto-link", response_model=EmailAutoLinkResult)
async def auto_link(
    email_ids: Optional[List[int]] = Query(None, description="Specific email IDs to link. If not provided, processes all unlinked emails."),
    db: Session = Depends(get_db)
):
    """Auto-link emails to monthly tasks/process instances using AI content analysis.

    The AI analyzes email content and matches it with appropriate process instances
    based on subject, sender, and content. Each link includes a confidence score (0-1).

    The behavior depends on the 'email_auto_link_mode' setting:
    - 'auto': Automatically create links for matches with confidence >= 0.7
    - 'approval': Only suggest links, requiring manual approval (not implemented in this endpoint)
    """
    result = {
        "success": True,
        "total_processed": 0,
        "linked": 0,
        "errors": [],
        "results": []
    }

    # Get auto-link mode setting
    auto_link_mode = get_email_auto_link_mode_setting(db)

    # Get emails to process
    query = db.query(Email)
    if email_ids:
        query = query.filter(Email.id.in_(email_ids))
    else:
        # Only process emails without any task links
        already_linked_ids = db.query(EmailTaskLink.email_id).distinct().subquery()
        query = query.filter(~Email.id.in_(already_linked_ids))

    emails = query.limit(30).all()  # Limit to 30 emails per batch
    result["total_processed"] = len(emails)

    if not emails:
        return EmailAutoLinkResult(**result)

    # Get current month's process instances with their types
    from datetime import datetime
    now = datetime.now()

    tasks = db.query(ProcessInstance).filter(
        ProcessInstance.year == now.year,
        ProcessInstance.month == now.month
    ).all()

    if not tasks:
        result["errors"].append("Nincs elérhető havi feladat az aktuális hónapban")
        result["success"] = False
        return EmailAutoLinkResult(**result)

    # Build task list for AI context
    available_tasks = []
    for task in tasks:
        process_type = db.query(ProcessType).filter(ProcessType.id == task.process_type_id).first()
        if process_type:
            available_tasks.append({
                "id": task.id,
                "name": process_type.name,
                "description": process_type.description or ""
            })

    if not available_tasks:
        result["errors"].append("Nincs folyamat típus az aktuális feladatokhoz")
        result["success"] = False
        return EmailAutoLinkResult(**result)

    task_list_text = "\n".join([f"- ID: {t['id']}, Név: {t['name']}" + (f", Leírás: {t['description'][:100]}" if t['description'] else "") for t in available_tasks])

    # Broadcast start
    await send_progress("email_auto_link.progress", {
        "status": "processing",
        "current": 0,
        "total": len(emails),
        "message": "AI email-feladat összerendelés indítása..."
    })

    system_prompt = f"""Te egy email elemző asszisztens vagy. A feladatod az email tartalom alapján megtalálni a megfelelő havi feladatot.

Elérhető feladatok:
{task_list_text}

Elemezd az email tartalmát (tárgy, feladó, szöveg) és válaszd ki a legmegfelelőbb feladatot.
Ha nem találsz megfelelő feladatot, állítsd a confidence értéket 0-ra.

Válaszolj CSAK JSON formátumban:
{{"task_id": SZÁM, "task_name": "FELADAT_NÉV", "confidence": 0.0-1.0, "reason": "Rövid indoklás magyarul"}}

Példa válasz:
{{"task_id": 5, "task_name": "Számlázás", "confidence": 0.85, "reason": "Az email számla mellékletről szól"}}"""

    for idx, email in enumerate(emails):
        try:
            # Build email content for AI
            email_content = f"""Tárgy: {email.subject or '(Nincs tárgy)'}
Feladó: {email.sender or 'Ismeretlen'}
Tartalom: {(email.body or '')[:1500]}"""

            messages = [{"role": "user", "content": email_content}]

            # Call AI service
            response_text, _, _ = await send_chat_message(
                messages=messages,
                db=db,
                system_prompt=system_prompt
            )

            # Parse response
            process_instance_id, confidence, reason = parse_ai_link_response(response_text, available_tasks)

            # Only link if we have a match and confidence is high enough (for auto mode)
            if process_instance_id and confidence >= 0.5:
                # Check if link already exists
                existing = db.query(EmailTaskLink).filter(
                    EmailTaskLink.email_id == email.id,
                    EmailTaskLink.process_instance_id == process_instance_id
                ).first()

                if not existing:
                    # Get task name for result
                    task_name = next((t["name"] for t in available_tasks if t["id"] == process_instance_id), "Ismeretlen")

                    # In auto mode with high confidence, create the link
                    if auto_link_mode == "auto" and confidence >= 0.7:
                        link = EmailTaskLink(
                            email_id=email.id,
                            process_instance_id=process_instance_id,
                            ai_confidence=confidence
                        )
                        db.add(link)
                        db.commit()
                        result["linked"] += 1

                    # Add to results (for both modes)
                    result["results"].append(EmailAutoLinkItem(
                        email_id=email.id,
                        process_instance_id=process_instance_id,
                        process_name=task_name,
                        confidence=confidence,
                        reason=reason
                    ))

            # Broadcast progress
            await send_progress("email_auto_link.progress", {
                "status": "processing",
                "current": idx + 1,
                "total": len(emails),
                "message": f"Feldolgozva: {email.subject[:50] if email.subject else '(Nincs tárgy)'}..."
            })

            # Yield control
            if (idx + 1) % 5 == 0:
                await asyncio.sleep(0)

        except Exception as e:
            error_msg = f"Hiba az email ({email.id}) összerendelésekor: {str(e)}"
            result["errors"].append(error_msg)

    # Broadcast completion
    await send_progress("email_auto_link.progress", {
        "status": "completed",
        "current": len(emails),
        "total": len(emails),
        "message": f"Összerendelés befejezve: {result['linked']} email összerendelve"
    })

    result["success"] = len(result["errors"]) == 0
    return EmailAutoLinkResult(**result)


@router.post("/{email_id}/link-task", response_model=EmailTaskLinkResponse)
def link_task(
    email_id: int,
    payload: EmailTaskLinkCreate,
    db: Session = Depends(get_db)
):
    """Manually link an email to a process instance (monthly task).

    This creates a manual link between an email and a task, without AI confidence score.
    """
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # Verify process instance exists
    task = db.query(ProcessInstance).filter(ProcessInstance.id == payload.process_instance_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check if link already exists
    existing = db.query(EmailTaskLink).filter(
        EmailTaskLink.email_id == email_id,
        EmailTaskLink.process_instance_id == payload.process_instance_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Link already exists")

    link = EmailTaskLink(
        email_id=email_id,
        process_instance_id=payload.process_instance_id,
        ai_confidence=None  # Manual links don't have AI confidence
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return link


@router.delete("/{email_id}/unlink-task/{task_id}")
def unlink_task(email_id: int, task_id: int, db: Session = Depends(get_db)):
    """Remove link between email and process instance (monthly task)."""
    link = db.query(EmailTaskLink).filter(
        EmailTaskLink.email_id == email_id,
        EmailTaskLink.process_instance_id == task_id
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    db.delete(link)
    db.commit()

    return {"message": "Unlinked"}
