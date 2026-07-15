import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import NotificationBell from "./NotificationBell";

const ROLE_LABELS = {
  comptable: "Comptable",
  avocat: "Avocat",
  risk_manager: "Risk Manager",
  auditeur: "Auditeur interne",
  admin: "Administrateur",
};

const NAV_ITEMS = [
  { to: "/dashboard",      label: "Tableau de bord",  icon: "▣"  },
  { to: "/reglementations",label: "Réglementations",  icon: "📋" },
  { to: "/chatbot",        label: "Assistant IA",      icon: "🤖" },
  { to: "/profil",         label: "Mon profil",        icon: "👤" },
  { to: "/contact",        label: "Nous contacter",    icon: "✉️" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { toasts, dismissToast } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-wide text-white">BIAT IT</h1>
          <p className="text-xs text-gray-400 mt-0.5">Plateforme Réglementaire</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV_ITEMS.filter((item) => !(item.to === "/contact" && user?.role === "admin")).map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <>
              <div className="pt-4 pb-1 px-3 text-xs text-gray-500 uppercase tracking-widest">
                Administration
              </div>
              {[
                { to: "/admin", label: "Tableau de bord", icon: "📊" },
                { to: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
                { to: "/admin/reglementations", label: "Réglementations", icon: "📁" },
                { to: "/admin/categories", label: "Catégories", icon: "🏷️" },
                { to: "/admin/contact", label: "Messages", icon: "✉️" },
              ].map((item) => {
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-gray-400">{ROLE_LABELS[user?.role]}</p>
            </div>
            <NotificationBell />
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* TOASTS */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm pointer-events-auto max-w-sm animate-slide-in ${
              t.type === "success"
                ? "bg-green-900/90 border-green-700 text-green-200"
                : t.type === "error"
                ? "bg-red-900/90 border-red-700 text-red-200"
                : "bg-slate-800/95 border-slate-700 text-white"
            }`}
          >
            <span className="shrink-0 text-base">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "🔔"}
            </span>
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 text-gray-400 hover:text-white transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
