import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";

const TYPE_LABELS = {
  new_message:    { icon: "✉️", label: "Nouveau message" },
  new_reply:      { icon: "💬", label: "Réponse reçue"  },
  new_regulation: { icon: "📋", label: "Nouveau document"},
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = () => {
    if (!open) markAllRead();
    setOpen((v) => !v);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:bg-slate-800 hover:text-white transition-colors"
        title="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {notifications.length > 0 && (
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Fermer
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">Aucune notification</p>
            ) : (
              notifications.map((n, i) => {
                const meta = TYPE_LABELS[n.type] || { icon: "🔔", label: n.type };
                const title =
                  n.type === "new_message"    ? `${n.data.user.prenom} ${n.data.user.nom} — ${n.data.sujet}`
                  : n.type === "new_reply"    ? `Réponse : ${n.data.sujet}`
                  : n.type === "new_regulation"? n.data.titre
                  : "";
                return (
                  <div key={i} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          {meta.label}
                        </p>
                        <p className="text-sm text-white truncate mt-0.5">{title}</p>
                        <p className="text-xs text-gray-600 mt-1">{timeAgo(n._ts || Date.now())}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
