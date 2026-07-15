import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import api from "../../services/api";

const ROLES = ["comptable", "avocat", "risk_manager", "auditeur"];
const ROLE_LABELS = {
  comptable:    "Comptable",
  avocat:       "Avocat",
  risk_manager: "Risk Manager",
  auditeur:     "Auditeur interne",
};

const EMPTY = {
  titre: "",
  reference: "",
  description: "",
  categorie_id: "",
  date_publication: "",
  date_mise_a_jour: "",
  organisme_emetteur: "",
  mots_cles: "",
  statut: "actif",
  roles_concernes: "",
  source: "interne",
  bct_url: "",
  note_interne: "",
};

export default function AdminRegulationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm]               = useState(EMPTY);
  const [categories, setCategories]   = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [pdfFile, setPdfFile]         = useState(null);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const fileRef = useRef();

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});

    if (isEdit) {
      api.get(`/regulations/${id}`)
        .then((res) => {
          const reg = res.data;
          setForm({
            titre:              reg.titre || "",
            reference:          reg.reference || "",
            description:        reg.description || "",
            categorie_id:       reg.categorie_id || "",
            date_publication:   reg.date_publication || "",
            date_mise_a_jour:   reg.date_mise_a_jour || "",
            organisme_emetteur: reg.organisme_emetteur || "",
            mots_cles:          reg.mots_cles || "",
            statut:             reg.statut || "actif",
            roles_concernes:    reg.roles_concernes || "",
            source:             reg.source || "interne",
            bct_url:            reg.bct_url || "",
            note_interne:       reg.note_interne || "",
          });
          setSelectedRoles(
            reg.roles_concernes
              ? reg.roles_concernes.split(",").map((r) => r.trim()).filter(Boolean)
              : []
          );
        })
        .catch(() => setError("Réglementation introuvable"))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) { setError("Le titre est obligatoire"); return; }
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      categorie_id:     form.categorie_id ? Number(form.categorie_id) : null,
      date_publication:  form.date_publication || null,
      date_mise_a_jour:  form.date_mise_a_jour || null,
      roles_concernes:   selectedRoles.join(",") || null,
      bct_url:           form.bct_url.trim() || null,
      note_interne:      form.note_interne.trim() || null,
    };

    try {
      let regId = id;
      if (isEdit) {
        await api.put(`/regulations/${id}`, payload);
      } else {
        const res = await api.post("/regulations", payload);
        regId = res.data.id;
      }

      if (pdfFile && regId) {
        const formData = new FormData();
        formData.append("file", pdfFile);
        await api.post(`/regulations/${regId}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      navigate("/admin/reglementations");
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl">
        <Link
          to="/admin/reglementations"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          ← Retour
        </Link>

        <h2 className="text-2xl font-bold text-white mb-6">
          {isEdit ? "Modifier la réglementation" : "Ajouter une réglementation"}
        </h2>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">

            {/* ── Type de document ─────────────────────────────── */}
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-2">Type de document</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, source: "interne" }))}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${
                    form.source === "interne"
                      ? "bg-violet-900/40 border-violet-600 text-violet-200"
                      : "bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-500"
                  }`}
                >
                  📋 Note Interne BIAT
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, source: "bct", organisme_emetteur: "Banque Centrale de Tunisie" }))}
                  className={`flex-1 py-3 rounded-lg text-sm font-medium border transition-colors ${
                    form.source === "bct"
                      ? "bg-emerald-900/40 border-emerald-600 text-emerald-200"
                      : "bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-500"
                  }`}
                >
                  🏛️ Réglementation BCT Officielle
                </button>
              </div>
            </div>

            {/* ── URL BCT (si source bct) ───────────────────────── */}
            {form.source === "bct" && (
              <div className="col-span-2">
                <label className="block text-sm text-gray-300 mb-1">URL source BCT</label>
                <input
                  name="bct_url"
                  value={form.bct_url}
                  onChange={handleChange}
                  placeholder="https://www.bct.gov.tn/..."
                  className="w-full p-3 rounded-lg bg-slate-900 border border-emerald-800 text-white outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            {/* ── Titre ─────────────────────────────────────────── */}
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Titre *</label>
              <input
                name="titre"
                value={form.titre}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Référence</label>
              <input
                name="reference"
                value={form.reference}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Organisme émetteur</label>
              <input
                name="organisme_emetteur"
                value={form.organisme_emetteur}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors resize-y"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Catégorie</label>
              <select
                name="categorie_id"
                value={form.categorie_id}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            {isEdit && (
              <div>
                <label className="block text-sm text-gray-300 mb-1">Statut</label>
                <select
                  name="statut"
                  value={form.statut}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="nouveau">Nouveau</option>
                  <option value="actif">Actif</option>
                  <option value="mis_a_jour">Mis à jour</option>
                  <option value="archive">Archivé</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-300 mb-1">Date de publication</label>
              <input
                name="date_publication"
                type="date"
                value={form.date_publication}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Date de mise à jour</label>
              <input
                name="date_mise_a_jour"
                type="date"
                value={form.date_mise_a_jour}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">
                Mots-clés <span className="text-gray-500">(séparés par des virgules)</span>
              </label>
              <input
                name="mots_cles"
                value={form.mots_cles}
                onChange={handleChange}
                placeholder="ex: capital, liquidité, ratio"
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-2">Rôles concernés</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedRoles.includes(role)
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-700 text-gray-400 hover:border-slate-500"
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
                <span className="text-xs text-gray-500 self-center ml-2">
                  {selectedRoles.length === 0 ? "Tous les rôles" : ""}
                </span>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Document PDF</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0] || null)}
                className="block text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
              />
              {pdfFile && (
                <p className="text-xs text-gray-400 mt-1">{pdfFile.name}</p>
              )}
            </div>

            {/* ── Note interne (admin uniquement) ──────────────── */}
            <div className="col-span-2">
              <label className="block text-sm text-gray-300 mb-1">
                Note interne{" "}
                <span className="text-xs text-violet-400">(visible uniquement par les administrateurs)</span>
              </label>
              <textarea
                name="note_interne"
                value={form.note_interne}
                onChange={handleChange}
                rows={3}
                placeholder="Commentaires internes, contexte, actions à mener…"
                className="w-full p-3 rounded-lg bg-slate-900 border border-violet-800 text-white outline-none focus:border-violet-500 transition-colors resize-y placeholder-gray-600"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Sauvegarde…" : isEdit ? "Enregistrer les modifications" : "Créer la réglementation"}
            </button>
            <Link
              to="/admin/reglementations"
              className="px-6 py-2.5 bg-slate-800 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}
