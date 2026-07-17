import { useEffect, useRef, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const SUGGESTIONS = [
  "Quelles sont les obligations de fonds propres selon Bâle III ?",
  "Expliquer les règles de LCR (Liquidity Coverage Ratio)",
  "Quelles sont les exigences du ratio de solvabilité BCT ?",
  "Quelles circulaires concernent la réserve obligatoire ?",
];

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff} jours`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function renderAnswer(text) {
  return text.split("\n").map((line, i) => {
    if (/^#{1,3}\s/.test(line)) {
      return <p key={i} className="font-semibold text-white mt-3 mb-1">{line.replace(/^#{1,3}\s/, "")}</p>;
    }
    if (/^\*\*(.+)\*\*$/.test(line)) {
      return <p key={i} className="font-semibold text-blue-300 mt-2">{line.replace(/\*\*/g, "")}</p>;
    }
    if (/^[-•]\s/.test(line)) {
      return (
        <div key={i} className="flex gap-2 mt-1">
          <span className="text-blue-400 mt-0.5 shrink-0">·</span>
          <span>{line.replace(/^[-•]\s/, "")}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="mt-1">{line}</p>;
  });
}

function UserMessage({ text }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-xl bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function BotMessage({ text, sources, loading, streaming }) {
  if (loading || (streaming && !text)) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex items-center gap-1 bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-gray-200 leading-relaxed">
          {renderAnswer(text)}
          {streaming && (
            <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>
        {!streaming && sources && sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-gray-600 w-full mb-1">Sources :</span>
            {sources.map((s, i) => {
              const basename = s.document.split(/[\\/]/).pop();
              const pdfUrl = `http://localhost:8000/uploads/${encodeURIComponent(basename)}`;
              return (
                <a
                  key={i}
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-gray-400 hover:border-blue-500 hover:text-blue-300 hover:bg-slate-800 transition-colors"
                  title={`Ouvrir — Pertinence : ${Math.round(s.score * 100)}%`}
                >
                  📄 <span className="max-w-[180px] truncate">{s.document}</span>
                  {s.page > 0 && <span className="text-gray-600">p.{s.page}</span>}
                  <span className="text-blue-500 font-medium">{Math.round(s.score * 100)}%</span>
                  <span className="text-gray-600">↗</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);

  // Historique
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Admin
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ text: "", type: "" });
  const [showAdmin, setShowAdmin] = useState(false);
  const fileInputRef = useRef();

  const bottomRef = useRef();

  const loadHistory = useCallback(() => {
    setLoadingHistory(true);
    api.get("/chatbot/history?limit=50")
      .then((r) => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    api.get("/chatbot/status").then((r) => setStatus(r.data)).catch(() => {});
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (isAdmin && showAdmin) {
      api.get("/chatbot/documents").then((r) => setDocuments(r.data)).catch(() => {});
    }
  }, [isAdmin, showAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput("");
    setError("");

    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "bot", text: "", sources: [], streaming: true },
    ]);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const baseURL = api.defaults.baseURL ?? "http://localhost:8000";
      const res = await fetch(`${baseURL}/chatbot/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: q, n_results: 6 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Erreur serveur" }));
        throw new Error(err.detail || "Erreur serveur");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "token") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = { ...last, text: last.text + data.content };
              return updated;
            });
          } else if (data.type === "sources") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], sources: data.sources };
              return updated;
            });
          } else if (data.type === "done") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], streaming: false };
              return updated;
            });
            loadHistory();
          } else if (data.type === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (err) {
      const detail = err.message || "Erreur de connexion au chatbot";
      setError(detail);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "bot") {
          updated[updated.length - 1] = { role: "bot", text: `⚠️ ${detail}`, sources: [], streaming: false };
        } else {
          updated.push({ role: "bot", text: `⚠️ ${detail}`, sources: [], streaming: false });
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item) => {
    setMessages([
      { role: "user", text: item.question },
      { role: "bot", text: item.answer, sources: item.sources || [] },
    ]);
    setError("");
  };

  const deleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/chatbot/history/${id}`).catch(() => {});
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = async () => {
    if (!window.confirm("Effacer tout l'historique ?")) return;
    await api.delete("/chatbot/history").catch(() => {});
    setHistory([]);
  };

  const newChat = () => {
    setMessages([]);
    setError("");
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg({ text: "", type: "" });
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post("/chatbot/ingest", form, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadMsg({ text: `✓ ${data.filename} — ${data.chunks_created} segments indexés`, type: "success" });
      const r = await api.get("/chatbot/documents");
      setDocuments(r.data);
      const s = await api.get("/chatbot/status");
      setStatus(s.data);
    } catch (err) {
      setUploadMsg({ text: err.response?.data?.detail || "Erreur lors de l'indexation", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (source) => {
    if (!window.confirm(`Supprimer "${source}" de la base ?`)) return;
    try {
      await api.delete(`/chatbot/documents/${encodeURIComponent(source)}`);
      setDocuments((prev) => prev.filter((d) => d.source !== source));
      const s = await api.get("/chatbot/status");
      setStatus(s.data);
    } catch {
      setUploadMsg({ text: "Erreur lors de la suppression", type: "error" });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-screen">

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
              title="Afficher/masquer l'historique"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div>
              <h2 className="font-semibold text-white text-sm">BIAT Assistant IA</h2>
              <p className="text-xs text-gray-500">Réglementations bancaires tunisiennes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status && (
              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                !status.ollama_running ? "bg-red-900/40 text-red-300 border-red-700"
                : status.model_available ? "bg-green-900/40 text-green-300 border-green-700"
                : "bg-amber-900/40 text-amber-300 border-amber-700"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  !status.ollama_running ? "bg-red-400"
                  : status.model_available ? "bg-green-400"
                  : "bg-amber-400 animate-pulse"
                }`} />
                {!status.ollama_running ? "Ollama hors ligne"
                  : status.model_available ? "Prêt"
                  : "Modèle non téléchargé"}
              </span>
            )}
            {status && (
              <span className="text-xs text-gray-500">{status.total_documents} doc · {status.total_chunks} segments</span>
            )}
            <button
              onClick={newChat}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition-colors"
            >
              + Nouvelle conversation
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdmin((v) => !v)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-gray-300 hover:bg-slate-700 transition-colors"
              >
                {showAdmin ? "Masquer" : "⚙️ Documents"}
              </button>
            )}
          </div>
        </div>

        {/* ADMIN PANEL */}
        {isAdmin && showAdmin && (
          <div className="shrink-0 border-b border-slate-800 bg-slate-900/60 px-6 py-4">
            <div className="flex items-center gap-4 mb-3">
              <h3 className="text-sm font-medium text-white">Gestion des documents RAG</h3>
              <label className={`cursor-pointer px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                {uploading ? "Indexation…" : "+ Ajouter PDF / TXT"}
                <input ref={fileInputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleUpload} />
              </label>
            </div>
            {uploadMsg.text && (
              <p className={`text-xs mb-3 ${uploadMsg.type === "success" ? "text-green-400" : "text-red-400"}`}>{uploadMsg.text}</p>
            )}
            {documents.length === 0 ? (
              <p className="text-xs text-gray-500">Aucun document indexé.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {documents.map((doc) => (
                  <div key={doc.source} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-gray-300 max-w-xs truncate" title={doc.source}>📄 {doc.source}</span>
                    <span className="text-xs text-gray-500">{doc.chunks} seg.</span>
                    <button onClick={() => handleDeleteDoc(doc.source)} className="text-xs text-red-400 hover:text-red-300 ml-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BODY : sidebar + chat */}
        <div className="flex flex-1 overflow-hidden">

          {/* SIDEBAR HISTORIQUE */}
          {showHistory && (
            <div className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Historique</span>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                    title="Effacer tout"
                  >
                    Tout effacer
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {loadingHistory ? (
                  <p className="text-xs text-gray-600 text-center py-6">Chargement…</p>
                ) : history.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <p className="text-xs text-gray-600">Aucune conversation</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadFromHistory(item)}
                      className="group flex items-start gap-2 px-3 py-2.5 mx-2 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-gray-600 text-xs mt-0.5 shrink-0">💬</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate leading-snug">{item.question}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(item.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-xs"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-900/40 border border-blue-700 flex items-center justify-center text-3xl mb-4">🤖</div>
                  <h3 className="text-lg font-semibold text-white mb-2">BIAT Assistant IA</h3>
                  <p className="text-gray-400 text-sm max-w-md mb-8">
                    Posez vos questions sur les circulaires BCT, les ratios prudentiels, la réglementation Bâle II/III
                    et tous les textes officiels du secteur bancaire tunisien.
                  </p>
                  {status?.ollama_running && !status?.model_available && (
                    <div className="mb-6 px-4 py-3 bg-amber-900/30 border border-amber-700 rounded-xl text-amber-300 text-sm max-w-md">
                      <p className="font-medium mb-1">⏳ Modèle IA non téléchargé</p>
                      <code className="block bg-slate-900 px-3 py-2 rounded text-white text-xs mt-2">
                        ollama pull {status.ollama_model}
                      </code>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-left px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-gray-300 hover:border-blue-600 hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) =>
                msg.role === "user"
                  ? <UserMessage key={i} text={msg.text} />
                  : <BotMessage key={i} text={msg.text} sources={msg.sources} streaming={msg.streaming} />
              )}
              {error && (
                <div className="mx-4 mb-3 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* INPUT */}
            <div className="shrink-0 px-6 py-4 border-t border-slate-800 bg-slate-900">
              <div className="flex gap-3 items-end">
                <textarea
                  value={input}
                  placeholder="Posez votre question sur les réglementations bancaires…"
                  rows={1}
                  className="flex-1 resize-none p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-blue-500 transition-colors leading-relaxed max-h-32"
                  style={{ height: "auto" }}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="shrink-0 w-11 h-11 flex items-center justify-center bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
