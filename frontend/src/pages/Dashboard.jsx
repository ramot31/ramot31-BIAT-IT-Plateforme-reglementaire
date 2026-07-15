import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import api from "../services/api";

const ROLE_LABELS = {
  comptable: "Comptable",
  avocat: "Avocat",
  risk_manager: "Risk Manager",
  auditeur: "Auditeur interne",
  admin: "Administrateur",
};

const STATUT_COLORS = {
  nouveau:    "bg-blue-900/40 text-blue-300 border-blue-700",
  actif:      "bg-green-900/40 text-green-300 border-green-700",
  mis_a_jour: "bg-amber-900/40 text-amber-300 border-amber-700",
  archive:    "bg-slate-700/40 text-slate-300 border-slate-600",
};

const STATUT_LABELS = {
  nouveau:    "Nouveau",
  actif:      "Actif",
  mis_a_jour: "Mis à jour",
  archive:    "Archivé",
};

function StatCard({ label, value, color = "blue" }) {
  const colors = {
    blue: "border-blue-700 text-blue-400",
    green: "border-green-700 text-green-400",
    amber: "border-amber-700 text-amber-400",
    purple: "border-purple-700 text-purple-400",
  };
  return (
    <div className={`bg-slate-900 border rounded-xl p-5 border-l-4 ${colors[color]}`}>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value ?? "—"}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    api.get("/regulations/recent?limit=5")
      .then((res) => setRecent(res.data))
      .catch(() => {})
      .finally(() => setLoadingRecent(false));

    if (user?.role === "admin") {
      api.get("/admin/stats")
        .then((res) => setStats(res.data))
        .catch(() => {});
    }
  }, [user]);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Bonjour, {user?.prenom}
          </h2>
          <p className="text-gray-400 mt-1">
            {ROLE_LABELS[user?.role]} · {user?.cabinet || "BIAT IT"}
          </p>
        </div>

        {/* ADMIN STATS */}
        {user?.role === "admin" && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Utilisateurs actifs" value={stats.active_users} color="blue" />
            <StatCard label="Réglementations" value={stats.total_regulations} color="green" />
            <StatCard label="Régl. actives" value={stats.active_regulations} color="purple" />
            <StatCard label="Catégories" value={stats.total_categories} color="amber" />
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/reglementations"
            className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-blue-600 transition-colors group"
          >
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              Réglementations
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Consulter et rechercher les textes réglementaires
            </p>
          </Link>

          <Link
            to="/profil"
            className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-blue-600 transition-colors group"
          >
            <div className="text-2xl mb-3">👤</div>
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              Mon profil
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Informations personnelles et rôle
            </p>
          </Link>

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-blue-600 transition-colors group"
            >
              <div className="text-2xl mb-3">⚙️</div>
              <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                Administration
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Gérer utilisateurs et documents
              </p>
            </Link>
          )}
        </div>

        {/* RECENT REGULATIONS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Réglementations récentes</h3>
            <Link to="/reglementations" className="text-sm text-blue-400 hover:underline">
              Voir tout →
            </Link>
          </div>

          {loadingRecent ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-gray-400">
              Aucune réglementation disponible pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((reg) => (
                <Link
                  key={reg.id}
                  to={`/reglementations/${reg.id}`}
                  className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{reg.titre}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {reg.organisme_emetteur && <span>{reg.organisme_emetteur} · </span>}
                        {reg.date_publication && (
                          <span>{new Date(reg.date_publication).toLocaleDateString("fr-FR")}</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs border ${
                        STATUT_COLORS[reg.statut] || STATUT_COLORS.actif
                      }`}
                    >
                      {STATUT_LABELS[reg.statut] || reg.statut}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
