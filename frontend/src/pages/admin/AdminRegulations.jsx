import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import api from "../../services/api";

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

const SOURCE_BADGE = {
  bct:     { label: "BCT Officiel", cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700" },
  interne: { label: "Note Interne", cls: "bg-violet-900/40 text-violet-300 border-violet-700" },
};

export default function AdminRegulations() {
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [scraping, setScraping]       = useState(false);
  const [message, setMessage]         = useState({ text: "", type: "" });
  const [deleting, setDeleting]       = useState(null);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const load = () => {
    setLoading(true);
    api.get("/regulations")
      .then((res) => setRegulations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette réglementation ?")) return;
    setDeleting(id);
    try {
      await api.delete(`/regulations/${id}`);
      setRegulations((prev) => prev.filter((r) => r.id !== id));
      showMsg("Réglementation supprimée");
    } catch {
      showMsg("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      await api.post("/regulations/scrape");
      showMsg("Scraping BCT lancé — les nouveaux règlements apparaîtront dans quelques instants.");
      setTimeout(load, 5000);
    } catch {
      showMsg("Erreur lors du déclenchement du scraping", "error");
    } finally {
      setScraping(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestion des réglementations</h2>
            <p className="text-gray-400 mt-1">{regulations.length} réglementation(s)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleScrape}
              disabled={scraping}
              title="Importer automatiquement les nouveaux règlements depuis le site BCT"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scraping ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Scraping…
                </>
              ) : (
                "↓ Importer depuis BCT"
              )}
            </button>
            <Link
              to="/admin/reglementations/ajouter"
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Ajouter
            </Link>
          </div>
        </div>

        {message.text && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
              message.type === "error"
                ? "bg-red-900/40 border-red-700 text-red-300"
                : "bg-green-900/40 border-green-700 text-green-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : regulations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-gray-400">
            Aucune réglementation.{" "}
            <Link to="/admin/reglementations/ajouter" className="text-blue-400 hover:underline">
              Ajouter la première
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-gray-400 text-left">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">PDF</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regulations.map((reg) => {
                  const src = SOURCE_BADGE[reg.source] || SOURCE_BADGE.interne;
                  return (
                    <tr key={reg.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium max-w-xs truncate">
                        {reg.titre}
                        {reg.note_interne && (
                          <span className="ml-2 text-xs text-violet-400" title={reg.note_interne}>📝</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${src.cls}`}>
                          {src.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{reg.reference || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{reg.categorie?.nom || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs border ${STATUT_COLORS[reg.statut] || STATUT_COLORS.actif}`}>
                          {STATUT_LABELS[reg.statut] || reg.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reg.fichier_pdf ? (
                          <a
                            href={`http://localhost:8000/uploads/${reg.fichier_pdf}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            PDF
                          </a>
                        ) : reg.bct_url ? (
                          <a
                            href={reg.bct_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            BCT ↗
                          </a>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            to={`/admin/reglementations/modifier/${reg.id}`}
                            className="px-3 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600 transition-colors"
                          >
                            Modifier
                          </Link>
                          <button
                            onClick={() => handleDelete(reg.id)}
                            disabled={deleting === reg.id}
                            className="px-3 py-1 bg-red-900/40 border border-red-800 rounded text-xs text-red-300 hover:bg-red-900/70 transition-colors disabled:opacity-50"
                          >
                            {deleting === reg.id ? "…" : "Supprimer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
