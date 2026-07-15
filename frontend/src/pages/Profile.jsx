import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import api from "../services/api";

const ROLE_LABELS = {
  comptable:    "Comptable",
  avocat:       "Avocat",
  risk_manager: "Risk Manager",
  auditeur:     "Auditeur interne",
  admin:        "Administrateur",
};

function Field({ label, value }) {
  return (
    <div className="py-3 border-b border-slate-800">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-white">{value || <span className="text-gray-500 italic">Non renseigné</span>}</p>
    </div>
  );
}

function InputPwd({ label, value, onChange, show, onToggle }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
        >
          {show ? "Masquer" : "Voir"}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();

  const [ancien, setAncien]       = useState("");
  const [nouveau, setNouveau]     = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showAncien, setShowAncien] = useState(false);
  const [showNouv, setShowNouv]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null); // { text, type }

  if (!user) return null;

  const initials = `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (nouveau.length < 8) {
      setMsg({ text: "Le nouveau mot de passe doit contenir au moins 8 caractères.", type: "error" });
      return;
    }
    if (nouveau !== confirm) {
      setMsg({ text: "Les deux mots de passe ne correspondent pas.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await api.put("/users/me/password", {
        ancien_mot_de_passe: ancien,
        nouveau_mot_de_passe: nouveau,
      });
      setMsg({ text: "Mot de passe modifié avec succès.", type: "success" });
      setAncien(""); setNouveau(""); setConfirm("");
    } catch (err) {
      setMsg({ text: err.response?.data?.detail || "Erreur lors de la modification.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold text-white">Mon profil</h2>

        {/* AVATAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-xl font-semibold text-white">{user.prenom} {user.nom}</p>
            <p className="text-gray-400 text-sm mt-0.5">{ROLE_LABELS[user.role]}</p>
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs border ${
              user.is_active
                ? "bg-green-900/40 text-green-300 border-green-700"
                : "bg-red-900/40 text-red-300 border-red-700"
            }`}>
              {user.is_active ? "Compte actif" : "Compte inactif"}
            </span>
          </div>
        </div>

        {/* INFORMATIONS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Informations personnelles</h3>
          <Field label="Prénom" value={user.prenom} />
          <Field label="Nom" value={user.nom} />
          <Field label="Adresse e-mail" value={user.email} />
          <Field label="Date de naissance"
            value={user.date_naissance && new Date(user.date_naissance).toLocaleDateString("fr-FR")} />
          <Field label="Rôle" value={ROLE_LABELS[user.role]} />
          <Field label="Cabinet / Département" value={user.cabinet} />
          <Field label="Compte BIAT" value={user.compte_biat ? "Oui" : "Non"} />
          <Field label="Membre depuis"
            value={user.created_at && new Date(user.created_at).toLocaleDateString("fr-FR")} />
        </div>

        {/* CHANGEMENT MOT DE PASSE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-1">Changer le mot de passe</h3>
          <p className="text-xs text-gray-500 mb-5">Minimum 8 caractères. Votre session restera active après le changement.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputPwd
              label="Mot de passe actuel"
              value={ancien}
              onChange={(e) => setAncien(e.target.value)}
              show={showAncien}
              onToggle={() => setShowAncien((v) => !v)}
            />
            <InputPwd
              label="Nouveau mot de passe"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              show={showNouv}
              onToggle={() => setShowNouv((v) => !v)}
            />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {msg && (
              <div className={`px-4 py-3 rounded-lg text-sm ${
                msg.type === "success"
                  ? "bg-green-900/30 border border-green-700 text-green-300"
                  : "bg-red-900/30 border border-red-700 text-red-300"
              }`}>
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !ancien || !nouveau || !confirm}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Modification…" : "Modifier le mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
