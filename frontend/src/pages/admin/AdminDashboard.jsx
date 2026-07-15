import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../services/api";

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: "border-blue-600 text-blue-400",
    green: "border-green-600 text-green-400",
    amber: "border-amber-600 text-amber-400",
    purple: "border-purple-600 text-purple-400",
    red: "border-red-600 text-red-400",
    slate: "border-slate-600 text-slate-400",
  };
  return (
    <div className={`bg-slate-900 border border-slate-800 border-l-4 ${colors[color]} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Tableau de bord administration</h2>
          <p className="text-gray-400 mt-1">Vue d'ensemble de la plateforme</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard label="Total utilisateurs" value={stats?.total_users} icon="👥" color="blue" />
              <StatCard label="Utilisateurs actifs" value={stats?.active_users} icon="✅" color="green" />
              <StatCard label="Réglementations" value={stats?.total_regulations} icon="📋" color="purple" />
              <StatCard label="Régl. actives" value={stats?.active_regulations} icon="📗" color="green" />
              <StatCard label="Régl. archivées" value={stats?.archived_regulations} icon="📦" color="slate" />
              <StatCard label="Catégories" value={stats?.total_categories} icon="🏷️" color="amber" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { to: "/admin/utilisateurs", icon: "👥", label: "Gérer les utilisateurs", desc: "Voir, modifier ou désactiver les comptes" },
                { to: "/admin/reglementations", icon: "📋", label: "Gérer les réglementations", desc: "Ajouter, modifier, supprimer des textes" },
                { to: "/admin/categories", icon: "🏷️", label: "Gérer les catégories", desc: "Organiser les catégories réglementaires" },
              ].map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-xl hover:border-blue-600 transition-colors group"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
