from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from auth import SECRET_KEY, ALGORITHM, require_admin, get_current_user, get_db
from database import SessionLocal
import models
from ws_manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        await ws.close(code=4001)
        return

    db = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    db.close()

    if not user or not user.is_active:
        await ws.close(code=4001)
        return

    is_admin = user.role == "admin"
    await manager.connect(user_id, is_admin, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.lu == False,
        )
        .order_by(models.Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id":         n.id,
            "type":       n.type,
            "data":       n.payload,
            "lu":         n.lu,
            "created_at": n.created_at.isoformat(),
        }
        for n in rows
    ]


@router.put("/notifications/lues")
def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.lu == False,
    ).update({"lu": True})
    db.commit()
    return {"ok": True}


@router.get("/ws/debug")
def ws_debug(_: models.User = Depends(require_admin)):
    return {
        "connected_users": list(manager._connections.keys()),
        "admin_ids":       list(manager._admin_ids),
        "total_connections": sum(len(v) for v in manager._connections.values()),
    }
