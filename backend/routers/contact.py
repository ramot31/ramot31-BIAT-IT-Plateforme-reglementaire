from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

import models
from auth import get_db, get_current_user, require_admin
from notif import notify_all_admins, notify_user

router = APIRouter(prefix="/contact", tags=["contact"])


class MessageCreate(BaseModel):
    sujet: str
    message: str


class ReponseCreate(BaseModel):
    reponse: str


def _serialize(m: models.ContactMessage) -> dict:
    return {
        "id":          m.id,
        "sujet":       m.sujet,
        "message":     m.message,
        "reponse":     m.reponse,
        "lu":          m.lu,
        "created_at":  m.created_at.isoformat(),
        "repondu_at":  m.repondu_at.isoformat() if m.repondu_at else None,
        "user": {
            "id":     m.user.id,
            "prenom": m.user.prenom,
            "nom":    m.user.nom,
            "email":  m.user.email,
            "role":   m.user.role,
        },
    }


# ── Utilisateur : envoyer un message ────────────────────────────────────────

@router.post("/", status_code=201)
async def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = models.ContactMessage(
        user_id=current_user.id,
        sujet=data.sujet,
        message=data.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    serialized = _serialize(msg)
    # Notifier les admins uniquement — jamais l'expéditeur lui-même
    await notify_all_admins("new_message", serialized, exclude_user_id=current_user.id)
    # Marquer les propres notifs new_message de l'expéditeur comme lues (cas admin testant)
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.type == "new_message",
    ).update({"lu": True})
    db.commit()
    return serialized


# ── Utilisateur : mes messages + réponses ───────────────────────────────────

@router.get("/me")
def my_messages(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.ContactMessage)
        .filter(models.ContactMessage.user_id == current_user.id)
        .order_by(models.ContactMessage.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in rows]


# ── Admin : tous les messages ────────────────────────────────────────────────

@router.get("/")
def all_messages(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    rows = (
        db.query(models.ContactMessage)
        .order_by(models.ContactMessage.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in rows]


# ── Admin : marquer comme lu ─────────────────────────────────────────────────

@router.put("/{msg_id}/lu")
def mark_read(
    msg_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    msg = db.query(models.ContactMessage).filter(models.ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message introuvable")
    msg.lu = True
    db.commit()
    return {"ok": True}


# ── Admin : répondre ─────────────────────────────────────────────────────────

@router.put("/{msg_id}/repondre")
async def reply(
    msg_id: int,
    data: ReponseCreate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(require_admin),
):
    msg = db.query(models.ContactMessage).filter(models.ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message introuvable")
    msg.reponse   = data.reponse
    msg.lu        = True
    msg.repondu_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(msg)

    # Supprimer toutes les notifs new_message et new_reply de l'admin (message traité)
    db.query(models.Notification).filter(
        models.Notification.user_id == current_admin.id,
        models.Notification.type.in_(["new_message", "new_reply"]),
    ).update({"lu": True})
    db.commit()

    serialized = _serialize(msg)
    # Notifier uniquement l'utilisateur qui a envoyé le message, jamais l'admin
    if msg.user_id != current_admin.id:
        await notify_user(msg.user_id, "new_reply", serialized)
    return serialized


# ── Admin : supprimer ────────────────────────────────────────────────────────

@router.delete("/{msg_id}", status_code=204)
def delete_message(
    msg_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    msg = db.query(models.ContactMessage).filter(models.ContactMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message introuvable")
    db.delete(msg)
    db.commit()
