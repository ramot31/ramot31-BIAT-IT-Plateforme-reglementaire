import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

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

const ROLE_LABELS = {
  comptable:    "Comptable",
  avocat:       "Avocat",
  risk_manager: "Risk Manager",
  auditeur:     "Auditeur interne",
  admin:        "Administrateur",
};

const SOURCE_INFO = {
  bct:     { label: "BCT Officiel", cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700", icon: "🏛️" },
  interne: { label: "Note Interne BIAT", cls: "bg-violet-900/40 text-violet-300 border-violet-700", icon: "📋" },
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-3 border-b border-slate-800">
      <span className="w-44 shrink-0 text-sm text-gray-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

export default function RegulationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [reg, setReg]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    api.get(`/regulations/${id}`)
      .then((res) => setReg(res.data))
      .catch(() => setError("Réglementation introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  const sourceInfo = reg ? (SOURCE_INFO[reg.source] || SOURCE_INFO.interne) : null;

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <Link
          to="/reglementations"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          ← Retour aux réglementations
        </Link>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-gray-400">
            {error}
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    {/* Badge source */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${sourceInfo.cls}`}>
                      {sourceInfo.icon} {sourceInfo.label}
                    </span>
                    {/* Lien BCT si disponible */}
                    {reg.bct_url && (
                      <a
                        href={reg.bct_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                      >
                        Voir sur bct.gov.tn ↗
                      </a>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-white leading-snug">{reg.titre}</h1>
                  {reg.reference && (
                    <span className="inline-block mt-2 text-sm text-gray-400 bg-slate-800 px-3 py-1 rounded">
                      Réf. {reg.reference}
                    </span>
                  )}
                </div>
                <span className={`shrink-0 px-3 py-1.5 rounded-full text-sm border ${STATUT_COLORS[reg.statut] || STATUT_COLORS.actif}`}>
                  {STATUT_LABELS[reg.statut] || reg.statut}
                </span>
              </div>

              {reg.description && (
                <p className="mt-4 text-gray-300 leading-relaxed">{reg.description}</p>
              )}
            </div>

            {/* DETAILS */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
              <h2 className="font-semibold text-white mb-4">Informations</h2>
              <InfoRow label="Catégorie" value={reg.categorie?.nom} />
              <InfoRow label="Organisme émetteur" value={reg.organisme_emetteur} />
              <InfoRow
                label="Date de publication"
                value={reg.date_publication && new Date(reg.date_publication).toLocaleDateString("fr-FR")}
              />
              <InfoRow
                label="Dernière mise à jour"
                value={reg.date_mise_a_jour && new Date(reg.date_mise_a_jour).toLocaleDateString("fr-FR")}
              />
              <InfoRow
                label="Rôles concernés"
                value={
                  reg.roles_concernes
                    ? reg.roles_concernes.split(",").map((r) => ROLE_LABELS[r.trim()] || r.trim()).join(", ")
                    : "Tous les rôles"
                }
              />
            </div>

            {/* KEYWORDS */}
            {reg.mots_cles && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h2 className="font-semibold text-white mb-3">Mots-clés</h2>
                <div className="flex flex-wrap gap-2">
                  {reg.mots_cles.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                    <span key={kw} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-gray-300">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PDF */}
            {reg.fichier_pdf && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h2 className="font-semibold text-white mb-3">Document associé</h2>
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📄</span>
                  <div>
                    <p className="text-sm text-gray-300">{reg.fichier_pdf}</p>
                    <a
                      href={`http://localhost:8000/uploads/${reg.fichier_pdf}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-2 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Télécharger / Visualiser
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* NOTE INTERNE — visible uniquement par l'admin */}
            {isAdmin && reg.note_interne && (
              <div className="bg-violet-900/20 border border-violet-800 rounded-xl p-6">
                <h2 className="font-semibold text-violet-200 mb-3 flex items-center gap-2">
                  📝 Note interne
                  <span className="text-xs text-violet-400 font-normal">(visible uniquement par les administrateurs)</span>
                </h2>
                <p className="text-sm text-violet-100 leading-relaxed whitespace-pre-wrap">{reg.note_interne}</p>
              </div>
            )}

            {/* Lien modifier (admin) */}
            {isAdmin && (
              <div className="mt-6">
                <Link
                  to={`/admin/reglementations/modifier/${reg.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  ✏️ Modifier cette réglementation
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
