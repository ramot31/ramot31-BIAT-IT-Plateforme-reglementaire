import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../services/api";

const ROLE_LABELS = {
  comptable:    "Comptable",
  avocat:       "Avocat",
  risk_manager: "Risk Manager",
  auditeur:     "Auditeur interne",
  admin:        "Administrateur",
};

const ROLE_COLORS = {
  comptable:    "bg-amber-900/30  text-amber-300  border-amber-700",
  avocat:       "bg-violet-900/30 text-violet-300 border-violet-700",
  risk_manager: "bg-rose-900/30   text-rose-300   border-rose-700",
  auditeur:     "bg-cyan-900/30   text-cyan-300   border-cyan-700",
  admin:        "bg-blue-900/30   text-blue-300   border-blue-700",
};

const ALL_ROLES = ["comptable", "avocat", "risk_manager", "auditeur", "admin"];

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors";

export default function AdminUsers() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  // Modal modifier
  const [editUser, setEditUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving]     = useState(false);

  // Modal supprimer
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get("/users")
      .then((r) => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (user) => {
    setEditUser(user);
    setEditData({
      prenom:    user.prenom    || "",
      nom:       user.nom       || "",
      role:      user.role      || "comptable",
      cabinet:   user.cabinet   || "",
      is_active: user.is_active ?? true,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/users/${editUser.id}`, editData);
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? res.data : u)));
      setEditUser(null);
      showToast("Utilisateur mis à jour avec succès.");
    } catch {
      showToast("Erreur lors de la mise à jour.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteUser.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
      showToast("Utilisateur supprimé.");
    } catch {
      showToast("Erreur lors de la suppression.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.prenom?.toLowerCase().includes(q) ||
      u.nom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout>
      <div className="p-8">

        {/* EN-TÊTE */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestion des utilisateurs</h2>
            <p className="text-gray-400 mt-1">{users.length} utilisateur(s) enregistré(s)</p>
          </div>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors w-56"
          />
        </div>

        {/* TOAST */}
        {toast && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            toast.type === "success"
              ? "bg-green-900/30 border-green-700 text-green-300"
              : "bg-red-900/30 border-red-700 text-red-300"
          }`}>
            {toast.text}
          </div>
        )}

        {/* TABLEAU */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-gray-400 text-left text-xs uppercase tracking-wide">
                  <th className="px-5 py-3">Utilisateur</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Rôle</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Cabinet</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-700/50 flex items-center justify-center text-xs font-bold text-blue-200 shrink-0">
                          {(user.prenom?.[0] || "") + (user.nom?.[0] || "")}
                        </div>
                        <span className="text-white font-medium">{user.prenom} {user.nom}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs border ${ROLE_COLORS[user.role] || ""}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs border ${
                        user.is_active
                          ? "bg-green-900/30 text-green-300 border-green-700"
                          : "bg-red-900/30 text-red-300 border-red-700"
                      }`}>
                        {user.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{user.cabinet || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-800 rounded-lg text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500 text-sm">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL MODIFICATION */}
      {editUser && (
        <Modal title={`Modifier — ${editUser.prenom} ${editUser.nom}`} onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom">
                <input className={inputCls} value={editData.prenom}
                  onChange={(e) => setEditData((p) => ({ ...p, prenom: e.target.value }))} />
              </Field>
              <Field label="Nom">
                <input className={inputCls} value={editData.nom}
                  onChange={(e) => setEditData((p) => ({ ...p, nom: e.target.value }))} />
              </Field>
            </div>
            <Field label="Cabinet / Département">
              <input className={inputCls} value={editData.cabinet}
                onChange={(e) => setEditData((p) => ({ ...p, cabinet: e.target.value }))} />
            </Field>
            <Field label="Rôle">
              <select className={inputCls} value={editData.role}
                onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))}>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut du compte">
              <select className={inputCls} value={editData.is_active ? "true" : "false"}
                onChange={(e) => setEditData((p) => ({ ...p, is_active: e.target.value === "true" }))}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL SUPPRESSION */}
      {deleteUser && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteUser(null)}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center text-2xl mx-auto mb-4">
              !
            </div>
            <p className="text-white font-medium mb-1">{deleteUser.prenom} {deleteUser.nom}</p>
            <p className="text-gray-400 text-sm mb-1">{deleteUser.email}</p>
            <p className="text-gray-500 text-xs mb-6">
              Cette action est irréversible. Toutes les données de cet utilisateur seront supprimées.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors">
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </button>
              <button onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
