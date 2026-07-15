import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import api from "../../services/api";

const ROLE_LABELS = {
  comptable: "Comptable", avocat: "Avocat",
  risk_manager: "Risk Manager", auditeur: "Auditeur", admin: "Admin",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminContact() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [reponse, setReponse]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [filter, setFilter]     = useState("tous");

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    api.get("/contact/")
      .then((r) => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openMessage = async (msg) => {
    setSelected(msg);
    setReponse(msg.reponse || "");
    if (!msg.lu) {
      await api.put(`/contact/${msg.id}/lu`).catch(() => {});
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, lu: true } : m));
    }
  };

  const handleReply = async () => {
    if (!reponse.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/contact/${selected.id}/repondre`, { reponse });
      setMessages((prev) => prev.map((m) => m.id === data.id ? data : m));
      setSelected(data);
      showToast("Réponse envoyée.");
    } catch {
      showToast("Erreur lors de l'envoi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    await api.delete(`/contact/${id}`).catch(() => {});
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
    showToast("Message supprimé.");
  };

  const filtered = messages.filter((m) => {
    if (filter === "nonlus") return !m.lu;
    if (filter === "attente") return !m.reponse;
    if (filter === "repondus") return !!m.reponse;
    return true;
  });

  const nonLus = messages.filter((m) => !m.lu).length;

  return (
    <Layout>
      <div className="flex h-screen overflow-hidden">

        {/* LISTE */}
        <div className="w-80 shrink-0 border-r border-slate-800 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white">Messages</h2>
              {nonLus > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 rounded-full text-xs font-medium">
                  {nonLus} nouveau{nonLus > 1 ? "x" : ""}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {[["tous","Tous"],["nonlus","Non lus"],["attente","En attente"],["repondus","Répondus"]].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    filter === k ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-10">Aucun message</p>
            ) : (
              filtered.map((m) => (
                <div key={m.id} onClick={() => openMessage(m)}
                  className={`px-5 py-4 border-b border-slate-800/60 cursor-pointer transition-colors ${
                    selected?.id === m.id ? "bg-slate-800" : "hover:bg-slate-900"
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!m.lu && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                        <p className={`text-sm truncate ${m.lu ? "text-gray-300" : "text-white font-medium"}`}>
                          {m.sujet}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {m.user.prenom} {m.user.nom}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatDate(m.created_at)}</p>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] border ${
                      m.reponse
                        ? "text-green-400 border-green-800 bg-green-900/20"
                        : "text-amber-400 border-amber-800 bg-amber-900/20"
                    }`}>
                      {m.reponse ? "Répondu" : "Attente"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DÉTAIL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              <div className="text-center">
                <p className="text-4xl mb-3">✉</p>
                <p className="text-sm">Sélectionnez un message</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header message */}
              <div className="px-8 py-5 border-b border-slate-800 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white text-lg">{selected.sujet}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{selected.user.prenom} {selected.user.nom}</span>
                    <span>·</span>
                    <span>{selected.user.email}</span>
                    <span>·</span>
                    <span className="capitalize">{ROLE_LABELS[selected.user.role]}</span>
                    <span>·</span>
                    <span>{formatDate(selected.created_at)}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(selected.id)}
                  className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-800 rounded-lg text-xs text-red-400 transition-colors shrink-0">
                  Supprimer
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                {/* Message utilisateur */}
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Message</p>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl px-5 py-4 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>

                {/* Réponse existante */}
                {selected.reponse && (
                  <div>
                    <p className="text-xs text-blue-400 mb-2 uppercase tracking-wide">
                      Votre réponse — {formatDate(selected.repondu_at)}
                    </p>
                    <div className="border-l-2 border-blue-600 pl-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {selected.reponse}
                    </div>
                  </div>
                )}
              </div>

              {/* Zone de réponse */}
              <div className="shrink-0 px-8 py-5 border-t border-slate-800 bg-slate-900/50">
                {toast && (
                  <div className={`mb-3 px-4 py-2 rounded-lg text-xs border ${
                    toast.type === "success"
                      ? "bg-green-900/30 border-green-700 text-green-300"
                      : "bg-red-900/30 border-red-700 text-red-300"
                  }`}>
                    {toast.text}
                  </div>
                )}
                <p className="text-xs text-gray-500 mb-2">
                  {selected.reponse ? "Modifier la réponse" : "Rédiger une réponse"}
                </p>
                <textarea
                  rows={4}
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Écrivez votre réponse…"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button onClick={handleReply} disabled={saving || !reponse.trim()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors">
                    {saving ? "Envoi…" : selected.reponse ? "Mettre à jour la réponse" : "Envoyer la réponse"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
