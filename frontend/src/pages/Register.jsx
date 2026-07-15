import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const ROLES = [
  { value: "comptable", label: "Comptable" },
  { value: "avocat", label: "Avocat" },
  { value: "risk_manager", label: "Risk Manager" },
  { value: "auditeur", label: "Auditeur interne" },
];

export default function Register() {
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    date_naissance: "",
    mot_de_passe: "",
    role: "comptable",
    cabinet: "",
    compte_biat: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.prenom || !form.nom || !form.email || !form.mot_de_passe) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        date_naissance: form.date_naissance || null,
        cabinet: form.cabinet || null,
      };
      await api.post("/auth/register", payload);
      navigate("/verify-email", { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <form
        autoComplete="off"
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-slate-900 rounded-2xl shadow-xl p-10 border border-slate-800"
      >
        <input style={{ display: "none" }} />

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Création de compte</h1>
          <p className="text-gray-400 mt-2 text-sm">Plateforme réglementaire bancaire BIAT IT</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Prénom *</label>
            <input
              name="prenom"
              value={form.prenom}
              autoComplete="off"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Nom *</label>
            <input
              name="nom"
              value={form.nom}
              autoComplete="off"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Adresse e-mail *</label>
            <input
              name="email"
              value={form.email}
              autoComplete="new-email"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Date de naissance</label>
            <input
              name="date_naissance"
              type="date"
              value={form.date_naissance}
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Mot de passe *</label>
            <input
              name="mot_de_passe"
              type="password"
              value={form.mot_de_passe}
              autoComplete="new-password"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Rôle *</label>
            <select
              name="role"
              value={form.role}
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Cabinet / Département</label>
            <input
              name="cabinet"
              value={form.cabinet}
              autoComplete="off"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white outline-none focus:border-blue-500 transition-colors"
              onChange={handleChange}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 mt-6 text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            name="compte_biat"
            checked={form.compte_biat}
            onChange={handleChange}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm">J'ai un compte chez BIAT</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 bg-blue-600 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Création en cours…" : "Créer le compte"}
        </button>

        <p className="text-center mt-6 text-gray-400 text-sm">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-blue-400 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
