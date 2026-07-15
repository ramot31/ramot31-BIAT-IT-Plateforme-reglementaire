"""
Centralise la création de notifications :
- Sauvegarde en base (persistance hors-ligne)
- Envoi WebSocket si le destinataire est connecté (temps réel)
"""
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from ws_manager import manager


def _save(db: Session, user_id: int, type_: str, payload: dict) -> models.Notification:
    n = models.Notification(user_id=user_id, type=type_, payload=payload)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


async def notify_user(user_id: int, type_: str, payload: dict, exclude_user_id: int = None):
    """Notifie un utilisateur précis (ex: réponse admin → utilisateur).
    Les new_reply ne sont jamais envoyées aux admins — seuls les utilisateurs reçoivent les réponses.
    """
    if exclude_user_id and user_id == exclude_user_id:
        return
    db = SessionLocal()
    try:
        target = db.query(models.User).filter(models.User.id == user_id).first()
        # Un admin ne doit jamais recevoir une new_reply (c'est lui qui répond)
        if target and target.role == "admin" and type_ == "new_reply":
            return
        _save(db, user_id, type_, payload)
    finally:
        db.close()
    await manager.send_to_user(user_id, {"type": type_, "data": payload})


async def notify_all_admins(type_: str, payload: dict, exclude_user_id: int = None):
    """Notifie tous les admins (ex: nouveau message utilisateur)."""
    db = SessionLocal()
    try:
        admins = db.query(models.User).filter(
            models.User.role == "admin",
            models.User.is_active == True,
        ).all()
        for admin in admins:
            if exclude_user_id and admin.id == exclude_user_id:
                continue
            _save(db, admin.id, type_, payload)
    finally:
        db.close()
    await manager.broadcast_admins({"type": type_, "data": payload}, exclude_user_id=exclude_user_id)


async def notify_all_users(type_: str, payload: dict, exclude_user_id: int = None, roles_concernes: str = None):
    """Notifie tous les utilisateurs actifs non-admin (ex: nouveau document).
    Si roles_concernes est fourni (ex: 'comptable,avocat'), seuls ces rôles sont notifiés.
    """
    roles_list = [r.strip() for r in roles_concernes.split(",") if r.strip()] if roles_concernes else []

    db = SessionLocal()
    try:
        users = db.query(models.User).filter(
            models.User.is_active == True,
            models.User.role != "admin",
        ).all()
        notified_ids = []
        for u in users:
            if exclude_user_id and u.id == exclude_user_id:
                continue
            if roles_list and u.role not in roles_list:
                continue
            _save(db, u.id, type_, payload)
            notified_ids.append(u.id)
    finally:
        db.close()

    ws_payload = {"type": type_, "data": payload}
    if roles_list:
        for uid in notified_ids:
            await manager.send_to_user(uid, ws_payload)
    else:
        await manager.broadcast_all(ws_payload, exclude_user_id=exclude_user_id)
