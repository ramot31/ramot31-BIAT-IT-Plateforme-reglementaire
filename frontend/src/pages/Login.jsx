import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !motDePasse) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const user = await login(email, motDePasse);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail === "EMAIL_NOT_VERIFIED") {
        // Rediriger vers la vérification email
        navigate("/verify-email", { state: { email } });
      } else {
        setError(detail || "Identifiants incorrects");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-lg border border-slate-800">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">BIAT IT</h1>
          <p className="text-gray-400 text-sm mt-1">Plateforme Réglementaire Bancaire</p>
        </div>

        <h2 className="text-xl font-semibold mb-6">Connexion</h2>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Adresse e-mail</label>
            <input
              type="email"
              value={email}
              placeholder="votre@email.com"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition-colors"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              placeholder="••••••••"
              className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 outline-none focus:border-blue-500 transition-colors"
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          Pas de compte ?{" "}
          <Link to="/register" className="text-blue-400 hover:underline">
            S'inscrire
          </Link>
        </p>

        <p className="text-center mt-2">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-400">
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
