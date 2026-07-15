from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_db, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats", response_model=schemas.AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    total_regulations = db.query(models.Regulation).count()
    active_regulations = db.query(models.Regulation).filter(models.Regulation.statut == "actif").count()
    archived_regulations = db.query(models.Regulation).filter(models.Regulation.statut == "archive").count()
    total_categories = db.query(models.Category).count()

    return schemas.AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_regulations=total_regulations,
        active_regulations=active_regulations,
        archived_regulations=archived_regulations,
        total_categories=total_categories,
    )
