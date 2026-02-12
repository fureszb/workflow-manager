"""APScheduler configuration for scheduled tasks.

Runs monthly task generation on the 1st of each month at 00:01.
Runs audit log cleanup daily at 02:00.
"""
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import ProcessInstance, ProcessType, StatusDefinition, AuditLog, AppSetting


def generate_monthly_tasks_job():
    """Generate monthly tasks for all active process types.

    This job runs on the 1st of each month at 00:01.
    Creates tasks for the current month if they don't already exist.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        year = now.year
        month = now.month

        # Get all active process types
        process_types = db.query(ProcessType).filter(ProcessType.is_active == True).all()

        # Get first status as default ("Tervezés")
        default_status = db.query(StatusDefinition).filter(
            StatusDefinition.is_active == True
        ).order_by(StatusDefinition.order).first()

        created_count = 0
        for pt in process_types:
            # Check if task already exists for this month (duplicate protection)
            existing = db.query(ProcessInstance).filter(
                ProcessInstance.process_type_id == pt.id,
                ProcessInstance.year == year,
                ProcessInstance.month == month,
            ).first()

            if not existing:
                task = ProcessInstance(
                    process_type_id=pt.id,
                    year=year,
                    month=month,
                    status_id=default_status.id if default_status else None,
                )
                db.add(task)
                created_count += 1

        db.commit()

        # Create audit log entry
        audit_entry = AuditLog(
            action="monthly_tasks_generated",
            entity_type="ProcessInstance",
            details=f"Automatikus havi feladat generálás: {created_count} feladat létrehozva ({year}/{month:02d})",
        )
        db.add(audit_entry)
        db.commit()

        print(f"[Scheduler] Generated {created_count} monthly tasks for {year}/{month:02d}")

    except Exception as e:
        print(f"[Scheduler] Error generating monthly tasks: {e}")
        db.rollback()
    finally:
        db.close()


def cleanup_audit_logs_job():
    """Clean up old audit log entries based on retention setting.

    This job runs daily at 02:00.
    Deletes audit logs older than the configured retention period.
    """
    db: Session = SessionLocal()
    try:
        # Get retention days from settings (default 90 days)
        setting = db.query(AppSetting).filter(AppSetting.key == "audit_log_retention_days").first()
        retention_days = 90  # Default
        if setting and setting.value:
            try:
                retention_days = int(setting.value)
            except ValueError:
                retention_days = 90

        # Don't clean up if retention is 0 (keep forever)
        if retention_days <= 0:
            print("[Scheduler] Audit log cleanup skipped (retention set to 0 = keep forever)")
            return

        cutoff_date = datetime.now() - timedelta(days=retention_days)
        deleted_count = db.query(AuditLog).filter(AuditLog.created_at < cutoff_date).delete()
        db.commit()

        if deleted_count > 0:
            # Create audit log entry for the cleanup itself
            audit_entry = AuditLog(
                action="audit_log_cleanup",
                entity_type="AuditLog",
                details=f"Automatikus audit log tisztítás: {deleted_count} bejegyzés törölve (megőrzés: {retention_days} nap)",
            )
            db.add(audit_entry)
            db.commit()

        print(f"[Scheduler] Cleaned up {deleted_count} old audit log entries (retention: {retention_days} days)")

    except Exception as e:
        print(f"[Scheduler] Error cleaning up audit logs: {e}")
        db.rollback()
    finally:
        db.close()


# Create scheduler instance
scheduler = BackgroundScheduler()


def init_scheduler():
    """Initialize and start the scheduler."""
    # Add job: run on 1st of each month at 00:01
    scheduler.add_job(
        generate_monthly_tasks_job,
        trigger=CronTrigger(day=1, hour=0, minute=1),
        id="monthly_task_generation",
        name="Generate monthly tasks",
        replace_existing=True,
    )

    # Add job: run daily at 02:00 for audit log cleanup
    scheduler.add_job(
        cleanup_audit_logs_job,
        trigger=CronTrigger(hour=2, minute=0),
        id="audit_log_cleanup",
        name="Clean up old audit logs",
        replace_existing=True,
    )

    scheduler.start()
    print("[Scheduler] Started - Monthly task generation scheduled for 1st of each month at 00:01")
    print("[Scheduler] Started - Audit log cleanup scheduled daily at 02:00")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Shutdown complete")
