from fastapi import WebSocket
from typing import Dict, Set
import asyncio


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[int, Set[WebSocket]] = {}
        self._admin_ids: Set[int] = set()

    async def connect(self, user_id: int, is_admin: bool, ws: WebSocket):
        await ws.accept()
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(ws)
        if is_admin:
            self._admin_ids.add(user_id)

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self._connections:
            self._connections[user_id].discard(ws)
            if not self._connections[user_id]:
                del self._connections[user_id]
                self._admin_ids.discard(user_id)

    async def send_to_user(self, user_id: int, payload: dict):
        dead = set()
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections.get(user_id, set()).discard(ws)

    async def broadcast_admins(self, payload: dict, exclude_user_id: int = None):
        for admin_id in list(self._admin_ids):
            if exclude_user_id and admin_id == exclude_user_id:
                continue
            await self.send_to_user(admin_id, payload)

    async def broadcast_all(self, payload: dict, exclude_user_id: int = None):
        for user_id in list(self._connections.keys()):
            if exclude_user_id and user_id == exclude_user_id:
                continue
            await self.send_to_user(user_id, payload)


manager = ConnectionManager()
