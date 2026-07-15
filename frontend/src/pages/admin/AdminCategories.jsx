import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../services/api";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nom: "", description: "" });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const load = () => {
    api.get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const res = await api.post("/categories", form);
      setCategories((prev) => [...prev, res.data]);
      setForm({ nom: "", description: "" });
      showMsg("Catégorie créée");
    } catch (err) {
      showMsg(err.response?.data?.detail || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat) => {
    setEditId(cat.id);
    setEditData({ nom: cat.nom, description: cat.description || "" });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const res = await api.put(`/categories/${id}`, editData);
      setCategories((prev) => prev.map((c) => (c.id === id ? res.data : c)));
      setEditId(null);
      showMsg("Catégorie mise à jour");
    } catch {
      showMsg("Erreur lors de la mise à jour", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette catégorie ?")) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showMsg("Catégorie supprimée");
    } catch {
      showMsg("Erreur lors de la suppression", "error");
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Gestion des catégories</h2>
          <p className="text-gray-400 mt-1">Organiser les réglementations par catégories</p>
        </div>

        {message.text && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
              message.type === "success"
                ? "bg-green-900/40 border-green-700 text-green-300"
                : "bg-red-900/40 border-red-700 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ADD FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">Nouvelle catégorie</h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              value={form.nom}
              placeholder="Nom de la catégorie"
              className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
              onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
            />
            <input
              value={form.description}
              placeholder="Description (optionnel)"
              className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
            <button
              type="submit"
              disabled={saving || !form.nom.trim()}
              className="px-4 py-3 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Ajouter
            </button>
          </form>
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-gray-400">
            Aucune catégorie. Créez la première ci-dessus.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {categories.map((cat, i) => (
              <div
                key={cat.id}
                className={`px-5 py-4 ${i < categories.length - 1 ? "border-b border-slate-800" : ""}`}
              >
                {editId === cat.id ? (
                  <div className="flex gap-3">
                    <input
                      value={editData.nom}
                      className="flex-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
                      onChange={(e) => setEditData((p) => ({ ...p, nom: e.target.value }))}
                    />
                    <input
                      value={editData.description}
                      placeholder="Description"
                      className="flex-1 p-2 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors text-sm"
                      onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                    />
                    <button
                      onClick={() => saveEdit(cat.id)}
                      disabled={saving}
                      className="px-3 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Sauver
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="px-3 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{cat.nom}</p>
                      {cat.description && (
                        <p className="text-gray-400 text-sm mt-0.5">{cat.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(cat)}
                        className="px-3 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600 transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="px-3 py-1 bg-red-900/40 border border-red-800 rounded text-xs text-red-300 hover:bg-red-900/70 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
