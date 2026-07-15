import os
import shutil
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

import models
import schemas
from auth import get_db, require_admin, get_current_user
from notif import notify_all_users


def _expire_nouveau(db: Session):
    """Passe 'nouveau' → 'actif' après 4 jours."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=4)
    db.query(models.Regulation).filter(
        models.Regulation.statut == "nouveau",
        models.Regulation.created_at < cutoff,
    ).update({"statut": "actif"}, synchronize_session=False)
    db.commit()

router = APIRouter(prefix="/regulations", tags=["regulations"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")


@router.get("/", response_model=List[schemas.RegulationOut])
def list_regulations(
    search: Optional[str] = Query(None),
    categorie_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _expire_nouveau(db)
    query = db.query(models.Regulation)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                models.Regulation.titre.ilike(like),
                models.Regulation.description.ilike(like),
                models.Regulation.mots_cles.ilike(like),
                models.Regulation.reference.ilike(like),
                models.Regulation.organisme_emetteur.ilike(like),
            )
        )

    if categorie_id:
        query = query.filter(models.Regulation.categorie_id == categorie_id)

    if statut:
        query = query.filter(models.Regulation.statut == statut)

    if date_from:
        query = query.filter(models.Regulation.date_publication >= date_from)

    if date_to:
        query = query.filter(models.Regulation.date_publication <= date_to)

    if current_user.role != "admin":
        query = query.filter(
            or_(
                models.Regulation.roles_concernes.is_(None),
                models.Regulation.roles_concernes == "",
                models.Regulation.roles_concernes.ilike(f"%{current_user.role}%"),
            )
        )

    return query.order_by(models.Regulation.created_at.desc()).all()


@router.get("/recent", response_model=List[schemas.RegulationOut])
def recent_regulations(
    limit: int = Query(5, le=20),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Regulation)
        .filter(models.Regulation.statut == "actif")
        .order_by(models.Regulation.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/{reg_id}", response_model=schemas.RegulationOut)
def get_regulation(
    reg_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    reg = db.query(models.Regulation).filter(models.Regulation.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Réglementation non trouvée")
    return reg


@router.post("/", response_model=schemas.RegulationOut, status_code=201)
async def create_regulation(
    data: schemas.RegulationCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_admin),
):
    reg_data = data.model_dump()
    reg_data["statut"] = "nouveau"  # toujours nouveau à la création
    reg = models.Regulation(**reg_data)
    db.add(reg)
    db.commit()
    db.refresh(reg)
    await notify_all_users(
        "new_regulation",
        {"id": reg.id, "titre": reg.titre, "reference": reg.reference},
        exclude_user_id=current_admin.id,
        roles_concernes=reg.roles_concernes,
    )
    return reg


@router.put("/{reg_id}", response_model=schemas.RegulationOut)
def update_regulation(
    reg_id: int,
    data: schemas.RegulationUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    reg = db.query(models.Regulation).filter(models.Regulation.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Réglementation non trouvée")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(reg, field, value)

    db.commit()
    db.refresh(reg)
    return reg


@router.delete("/{reg_id}", status_code=204)
def delete_regulation(
    reg_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    reg = db.query(models.Regulation).filter(models.Regulation.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Réglementation non trouvée")
    db.delete(reg)
    db.commit()


@router.post("/scrape", status_code=200)
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    _: models.User = Depends(require_admin),
):
    """Déclenche manuellement le scraping BCT (admin uniquement)."""
    from scraper.bct_scraper import run_scrape
    background_tasks.add_task(run_scrape)
    return {"message": "Scraping BCT lancé en arrière-plan"}


@router.post("/{reg_id}/upload")
def upload_pdf(
    reg_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    reg = db.query(models.Regulation).filter(models.Regulation.id == reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Réglementation non trouvée")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    filename = f"reg_{reg_id}_{file.filename}"
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    reg.fichier_pdf = filename
    db.commit()
    return {"filename": filename}
