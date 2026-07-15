import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import api from "../services/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [toasts, setToasts]               = useState([]);
  const wsRef     = useRef(null);
  const retryRef  = useRef(null);
  const aliveRef  = useRef(true);
  const userRef   = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  const connect = useCallback(() => {
    if (!aliveRef.current) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      api.get("/notifications").then((res) => {
        const isAdmin = userRef.current?.role === "admin";
        const fetched = res.data
          .filter((n) => !(isAdmin && n.type === "new_reply")) // admin ne voit jamais new_reply
          .map((n) => ({
            type: n.type,
            data: n.data,
            _ts:  new Date(n.created_at).getTime(),
            _id:  n.id,
          }));
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n._id).filter(Boolean));
          const newOnes = fetched.filter((n) => !existingIds.has(n._id));
          if (newOnes.length === 0) return prev;
          return [...newOnes, ...prev].slice(0, 50);
        });
        setUnreadCount(fetched.length);
      }).catch(() => {});
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const isAdmin = userRef.current?.role === "admin";
        // Admin ne reçoit jamais new_reply via WS (il est l'émetteur de la réponse)
        if (isAdmin && payload.type === "new_reply") return;
        setNotifications((prev) => {
          const newNotif = { ...payload, _ts: Date.now() };
          return [newNotif, ...prev.filter((n) => n._id !== newNotif._id).slice(0, 49)];
        });
        setUnreadCount((prev) => prev + 1);

        if (payload.type === "new_message") {
          const { prenom, nom } = payload.data.user;
          addToast(`Nouveau message de ${prenom} ${nom} : ${payload.data.sujet}`, "info");
        } else if (payload.type === "new_reply") {
          addToast(`Réponse reçue pour : ${payload.data.sujet}`, "success");
        } else if (payload.type === "new_regulation") {
          addToast(`Nouveau document ajouté : ${payload.data.titre}`, "info");
        }
      } catch (_) {}
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      wsRef.current = null;
      if (!aliveRef.current) return;
      retryRef.current = setTimeout(connect, 3000);
    };
  }, [addToast]);

  // Charge les notifications non lues depuis la DB au login
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      aliveRef.current = false;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    aliveRef.current = true;
    connect();

    return () => {
      aliveRef.current = false;
      clearTimeout(retryRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, connect]);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    api.put("/notifications/lues").catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, toasts, markAllRead, dismissToast, addToast }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
