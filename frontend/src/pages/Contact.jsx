import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const CONTACT_EMAIL = "contact.it@biat.com.tn";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const inputCls = "w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600";

export default function Contact() {
  const [form, setForm]       = useState({ sujet: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const [messages, setMessages] = useState([]);

  const loadMessages = () =>
    api.get("/contact/me").then((r) => setMessages(r.data)).catch(() => {});

  useEffect(() => { loadMessages(); }, []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await api.post("/contact/", form);
      setSent(true);
      setForm({ sujet: "", message: "" });
      loadMessages();
    } catch {
      setError("Erreur lors de l'envoi. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Nous contacter</h2>
          <p className="text-gray-400 mt-1">
            Une question, un problème ou une demande ? Notre équipe vous répond rapidement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* FORMULAIRE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-5">Envoyer un message</h3>

            {sent ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-green-900/30 border border-green-700 flex items-center justify-center text-2xl mb-4">
                  ✓
                </div>
                <p className="text-green-300 font-medium mb-1">Message envoyé</p>
                <p className="text-gray-500 text-sm mb-6">
                  Nous vous répondrons dans les plus brefs délais.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Sujet</label>
                  <input required value={form.sujet} onChange={set("sujet")}
                    placeholder="Ex : Problème de connexion, document manquant…"
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Message</label>
                  <textarea required rows={6} value={form.message} onChange={set("message")}
                    placeholder="Décrivez votre demande en détail…"
                    className={`${inputCls} resize-none`} />
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button type="submit" disabled={sending || !form.sujet || !form.message}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors">
                  {sending ? "Envoi…" : "Envoyer le message"}
                </button>
              </form>
            )}
          </div>

          {/* INFOS + HORAIRES */}
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                  ✉️
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Email de contact</p>
                  <p className="text-gray-500 text-xs mt-0.5 mb-2">
                    Pour toute question technique, réglementaire ou administrative.
                  </p>
                  <a href={`mailto:${CONTACT_EMAIL}`}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="font-medium text-white text-sm mb-3">Heures d'assistance</p>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Lundi — Vendredi</span>
                  <span className="text-white">08h00 — 17h00</span>
                </div>
                <div className="flex justify-between">
                  <span>Samedi</span>
                  <span className="text-white">08h00 — 13h00</span>
                </div>
                <div className="flex justify-between">
                  <span>Dimanche</span>
                  <span className="text-gray-600">Fermé</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-400">Support disponible actuellement</span>
              </div>
            </div>
          </div>
        </div>

        {/* MES MESSAGES */}
        {messages.length > 0 && (
          <div className="mt-10">
            <h3 className="font-semibold text-white mb-4">Mes messages</h3>
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="font-medium text-white text-sm">{m.sujet}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(m.created_at)}</p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs border ${
                      m.reponse
                        ? "bg-green-900/30 text-green-300 border-green-700"
                        : "bg-amber-900/30 text-amber-300 border-amber-700"
                    }`}>
                      {m.reponse ? "Répondu" : "En attente"}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm bg-slate-800/50 rounded-xl px-4 py-3">
                    {m.message}
                  </p>

                  {m.reponse && (
                    <div className="mt-3 border-l-2 border-blue-600 pl-4">
                      <p className="text-xs text-blue-400 mb-1 font-medium">
                        Réponse de l'administration — {formatDate(m.repondu_at)}
                      </p>
                      <p className="text-gray-300 text-sm">{m.reponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
