import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "📚",
    title: "Gestion documentaire",
    desc: "Centralisation des circulaires, notes et textes réglementaires dans un espace unique et structuré.",
    color: "from-blue-900/30 to-slate-900",
    border: "hover:border-blue-600/50",
    glow: "hover:shadow-blue-900/20",
  },
  {
    icon: "🤖",
    title: "Assistant IA",
    desc: "Posez vos questions en langage naturel. L'IA analyse les documents officiels et vous répond instantanément.",
    color: "from-violet-900/30 to-slate-900",
    border: "hover:border-violet-600/50",
    glow: "hover:shadow-violet-900/20",
  },
  {
    icon: "🔍",
    title: "Recherche avancée",
    desc: "Filtres par catégorie, date, organisme et mots-clés pour atteindre le bon document en secondes.",
    color: "from-cyan-900/30 to-slate-900",
    border: "hover:border-cyan-600/50",
    glow: "hover:shadow-cyan-900/20",
  },
  {
    icon: "🔐",
    title: "Accès sécurisé",
    desc: "Authentification par email vérifiée, gestion des rôles métier et sessions JWT sécurisées.",
    color: "from-emerald-900/30 to-slate-900",
    border: "hover:border-emerald-600/50",
    glow: "hover:shadow-emerald-900/20",
  },
  {
    icon: "📊",
    title: "Tableau de bord",
    desc: "Statistiques en temps réel, activités récentes et vue synthétique de la conformité.",
    color: "from-amber-900/30 to-slate-900",
    border: "hover:border-amber-600/50",
    glow: "hover:shadow-amber-900/20",
  },
  {
    icon: "🏛️",
    title: "Conformité BCT",
    desc: "Couverture complète des textes officiels de la Banque Centrale de Tunisie de 2016 à 2026.",
    color: "from-rose-900/30 to-slate-900",
    border: "hover:border-rose-600/50",
    glow: "hover:shadow-rose-900/20",
  },
];

const STATS = [
  { value: "161+", label: "Documents indexés",  icon: "📄" },
  { value: "2016", label: "Couverture depuis",   icon: "📅" },
  { value: "4",    label: "Rôles métier",        icon: "👥" },
  { value: "100%", label: "Sécurisé & conforme", icon: "🔒" },
];

const ROLES = ["Comptable", "Avocat", "Risk Manager", "Auditeur"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* ── Fond décoratif ───────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-orb absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, transparent 65%)" }} />
        <div className="glow-orb absolute top-1/2 -right-60 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, #1e3a8a 0%, transparent 65%)", animationDelay: "2s" }} />
        <div className="glow-orb absolute -bottom-60 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, transparent 65%)", animationDelay: "1s" }} />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-800/30 to-transparent" />
      </div>

      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <header className="anim-fade-in relative z-10 flex justify-between items-center px-8 py-4 border-b border-slate-800/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg px-2 py-1 shadow-md shadow-blue-950/30">
            <img src="/logo.jpg" alt="BIAT" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 leading-tight">Plateforme interne</p>
            <p className="text-xs font-semibold text-gray-300 leading-tight">BIAT IT Plateforme</p>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link to="/login"
            className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all duration-200">
            Connexion
          </Link>
          <Link to="/register"
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-900/30 hover:-translate-y-px">
            Inscription
          </Link>
        </nav>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">

        <div className="anim-fade-in-up delay-100 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-950/60 border border-blue-700/40 rounded-full text-blue-300 text-xs font-medium mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Solution interne — BIAT Innovation &amp; Technology · Tunis
        </div>

        <h1 className="anim-fade-in-up delay-200 text-5xl md:text-6xl font-extrabold leading-tight max-w-4xl tracking-tight">
          Gestion des{" "}
          <span className="shimmer-text">réglementations</span>
          <br />
          <span className="text-gray-300 font-semibold text-4xl md:text-5xl">bancaires centralisée</span>
        </h1>

        <p className="anim-fade-in-up delay-300 text-gray-400 mt-5 max-w-xl text-base leading-relaxed">
          Accédez, recherchez et comprenez les textes officiels grâce à un système
          sécurisé et un assistant IA formé sur les circulaires de la BCT.
        </p>

        <div className="anim-fade-in-up delay-400 flex flex-col sm:flex-row gap-3 mt-9">
          <Link to="/register"
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-base transition-all duration-200 shadow-xl shadow-blue-900/40 hover:shadow-blue-700/50 hover:-translate-y-0.5">
            Accéder à la plateforme →
          </Link>
          <Link to="/login"
            className="px-8 py-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl font-medium text-base transition-all duration-200 hover:-translate-y-0.5 backdrop-blur-sm">
            Se connecter
          </Link>
        </div>

        <div className="anim-fade-in-up delay-500 flex flex-wrap justify-center gap-2 mt-8">
          {ROLES.map((r) => (
            <span key={r}
              className="px-3 py-1 bg-slate-900/70 border border-slate-800 rounded-full text-xs text-gray-400 backdrop-blur-sm hover:border-blue-700/50 hover:text-blue-300 transition-colors duration-200 cursor-default">
              {r}
            </span>
          ))}
        </div>
      </main>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-12 border-y border-slate-800/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label, icon }, i) => (
            <div key={label}
              className={`anim-fade-in-up delay-${(i + 2) * 100} group text-center p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-blue-700/40 transition-all duration-200 hover:-translate-y-1`}>
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-3xl font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{value}</p>
              <p className="text-gray-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="anim-fade-in-up delay-100 text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Une plateforme complète pour les professionnels de la conformité et de la réglementation bancaire
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, desc, color, border, glow }, i) => (
              <div key={title}
                className={`anim-fade-in-up delay-${(i + 2) * 100} group relative overflow-hidden bg-gradient-to-br ${color} border border-slate-800 ${border} rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${glow} cursor-default`}>
                <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-300" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-200">
                    {icon}
                  </div>
                  <h3 className="font-bold text-white mb-2 text-base">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="relative z-10 px-8 pb-20">
        <div className="anim-fade-in-up delay-200 max-w-2xl mx-auto relative overflow-hidden rounded-2xl border border-blue-800/40 bg-gradient-to-br from-blue-950/60 to-slate-900/80 backdrop-blur-sm p-10 text-center">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-600/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-700/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-3">Prêt à commencer ?</h2>
            <p className="text-gray-400 text-sm mb-7 leading-relaxed">
              Créez votre compte et accédez immédiatement aux 161 réglementations
              indexées et à l'assistant IA.
            </p>
            <Link to="/register"
              className="inline-block px-9 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-all duration-200 shadow-xl shadow-blue-900/40 hover:-translate-y-0.5">
              Créer un compte →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/60 py-6 px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
          <span className="text-gray-600 text-xs font-medium">BIAT IT Plateforme</span>
          <p className="text-gray-700 text-xs">
            © 2026 — Plateforme interne de gestion des réglementations bancaires
          </p>
        </div>
      </footer>

    </div>
  );
}
