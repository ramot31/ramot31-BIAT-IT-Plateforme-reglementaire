import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUT_COLORS = {
  nouveau:    "bg-blue-900/40 text-blue-300 border-blue-700",
  actif:      "bg-green-900/40 text-green-300 border-green-700",
  mis_a_jour: "bg-amber-900/40 text-amber-300 border-amber-700",
  archive:    "bg-slate-700/40 text-slate-300 border-slate-600",
};

const SOURCE_BADGE = {
  bct:     { label: "BCT Officiel", cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700" },
  interne: { label: "Note Interne", cls: "bg-violet-900/40 text-violet-300 border-violet-700" },
};

const STATUT_LABELS = {
  nouveau:    "Nouveau",
  actif:      "Actif",
  mis_a_jour: "Mis à jour",
  archive:    "Archivé",
};

const ROLE_CATEGORY = {
  comptable:    "Comptabilite & Finance",
  avocat:       "Juridique & Conformite",
  risk_manager: "Gestion des Risques",
  auditeur:     "Audit & Controle Interne",
};

const ROLE_LABELS = {
  comptable:    { label: "Comptabilité & Finance",   icon: "📊", color: "text-amber-300  border-amber-700  bg-amber-900/20" },
  avocat:       { label: "Juridique & Conformité",   icon: "⚖️", color: "text-violet-300 border-violet-700 bg-violet-900/20" },
  risk_manager: { label: "Gestion des Risques",      icon: "🛡️", color: "text-rose-300   border-rose-700   bg-rose-900/20" },
  auditeur:     { label: "Audit & Contrôle Interne", icon: "🔍", color: "text-cyan-300   border-cyan-700   bg-cyan-900/20" },
};

export default function Regulations() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [regulations, setRegulations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Vue : "mes" = filtrés par rôle, "tous" = tout voir
  const [vue, setVue] = useState(isAdmin ? "tous" : "mes");

  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [statut, setStatut]           = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");

  // Résout l'ID de la catégorie liée au rôle de l'utilisateur
  const roleCatName = ROLE_CATEGORY[user?.role];
  const roleCatId = categories.find(
    (c) => c.nom.toLowerCase().replace(/\s/g, " ") === roleCatName?.toLowerCase().replace(/\s/g, " ")
  )?.id ?? null;

  const fetchRegulations = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)      params.append("search", search);
    if (statut)      params.append("statut", statut);
    if (dateFrom)    params.append("date_from", dateFrom);
    if (dateTo)      params.append("date_to", dateTo);

    // En vue "mes" on injecte automatiquement la catégorie du rôle
    const effectiveCatId = vue === "mes" && roleCatId ? roleCatId : categorieId;
    if (effectiveCatId) params.append("categorie_id", effectiveCatId);

    api.get(`/regulations?${params.toString()}`)
      .then((res) => setRegulations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, categorieId, statut, dateFrom, dateTo, vue, roleCatId]);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearch(""); setSearchInput(""); setCategorieId("");
    setStatut(""); setDateFrom(""); setDateTo("");
  };

  const roleInfo = ROLE_LABELS[user?.role];
  const hasFilters = search || categorieId || statut || dateFrom || dateTo;

  return (
    <Layout>
      <div className="p-8">

        {/* TITRE */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Réglementations</h2>
          <p className="text-gray-400 mt-1">Recherchez et consultez les textes réglementaires officiels</p>
        </div>

        {/* TABS VUE */}
        {!isAdmin && roleInfo && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setVue("mes"); resetFilters(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                vue === "mes"
                  ? `${roleInfo.color} border-current`
                  : "bg-slate-900 border-slate-800 text-gray-400 hover:border-slate-600"
              }`}
            >
              {roleInfo.icon} Mes documents — {roleInfo.label}
            </button>
            <button
              onClick={() => { setVue("tous"); resetFilters(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                vue === "tous"
                  ? "bg-blue-900/30 text-blue-300 border-blue-700"
                  : "bg-slate-900 border-slate-800 text-gray-400 hover:border-slate-600"
              }`}
            >
              📁 Tous les documents
            </button>
          </div>
        )}

        {/* BANDEAU ROLE */}
        {!isAdmin && roleInfo && vue === "mes" && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${roleInfo.color}`}>
            <span className="text-xl">{roleInfo.icon}</span>
            <div>
              <p className="text-sm font-semibold">Documents {roleInfo.label}</p>
              <p className="text-xs opacity-70">Affichage des réglementations correspondant à votre profil métier</p>
            </div>
          </div>
        )}

        {/* BARRE DE RECHERCHE */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            type="text"
            value={searchInput}
            placeholder="Rechercher par titre, mot-clé, référence, organisme…"
            className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="px-5 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Rechercher
          </button>
        </form>

        {/* FILTRES */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Catégorie — masquée en vue "mes" (déjà filtré) */}
          {vue === "tous" && (
            <select
              value={categorieId}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
              onChange={(e) => setCategorieId(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          )}

          <select
            value={statut}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
            onChange={(e) => setStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="nouveau">Nouveau</option>
            <option value="actif">Actif</option>
            <option value="mis_a_jour">Mis à jour</option>
            <option value="archive">Archivé</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Du</span>
            <input type="date" value={dateFrom}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
              onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-gray-400 text-sm">au</span>
            <input type="date" value={dateTo}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
              onChange={(e) => setDateTo(e.target.value)} />
          </div>

          {hasFilters && (
            <button onClick={resetFilters}
              className="px-3 py-2 rounded-lg bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors text-sm">
              Réinitialiser
            </button>
          )}
        </div>

        {/* COMPTEUR */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-sm">
            {loading ? "Chargement…" : `${regulations.length} résultat(s)`}
          </p>
        </div>

        {/* RÉSULTATS */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : regulations.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-gray-400">Aucune réglementation trouvée.</p>
            {hasFilters && (
              <button onClick={resetFilters} className="mt-3 text-blue-400 text-sm hover:underline">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {regulations.map((reg) => (
              <Link
                key={reg.id}
                to={`/reglementations/${reg.id}`}
                className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white">{reg.titre}</h3>
                      {reg.reference && (
                        <span className="text-xs text-gray-500 bg-slate-800 px-2 py-0.5 rounded">
                          {reg.reference}
                        </span>
                      )}
                      {(() => {
                        const src = SOURCE_BADGE[reg.source] || SOURCE_BADGE.interne;
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${src.cls}`}>
                            {src.label}
                          </span>
                        );
                      })()}
                    </div>
                    {reg.description && (
                      <p className="text-gray-400 text-sm mt-1.5 line-clamp-2">{reg.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                      {reg.categorie && (
                        <span className="flex items-center gap-1">
                          📁 {reg.categorie.nom}
                        </span>
                      )}
                      {reg.organisme_emetteur && <span>🏛️ {reg.organisme_emetteur}</span>}
                      {reg.date_publication && (
                        <span>📅 {new Date(reg.date_publication).toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                    {reg.mots_cles && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {reg.mots_cles.split(",").map((kw) => kw.trim()).filter(Boolean).map((kw) => (
                          <span key={kw} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-gray-400">{kw}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs border ${STATUT_COLORS[reg.statut] || STATUT_COLORS.actif}`}>
                    {STATUT_LABELS[reg.statut] || reg.statut}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
