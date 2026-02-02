from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import AppSetting

router = APIRouter(prefix="/settings")


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    rows = db.query(AppSetting).all()
    return {row.key: row.value for row in rows}


@router.get("/{key}")
def get_setting(key: str, db: Session = Depends(get_db)):
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not row:
        return {"key": key, "value": None}
    return {"key": row.key, "value": row.value}


@router.put("")
def update_settings(body: dict, db: Session = Depends(get_db)):
    for key, value in body.items():
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row:
            row.value = value
        else:
            row = AppSetting(key=key, value=value)
            db.add(row)
    db.commit()
    rows = db.query(AppSetting).all()
    return {r.key: r.value for r in rows}


@router.put("/{key}")
def update_setting(key: str, body: dict, db: Session = Depends(get_db)):
    value = body.get("value")
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = AppSetting(key=key, value=value)
        db.add(row)
    db.commit()
    db.refresh(row)
    return {"key": row.key, "value": row.value}
