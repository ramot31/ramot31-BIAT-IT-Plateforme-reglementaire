import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const { loginWithToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // L'email est passé via le state de navigation (Register → VerifyEmail)
  const email = location.state?.email || "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirectIn, setRedirectIn] = useState(6);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef([]);

  // Rediriger si pas d'email
  useEffect(() => {
    if (!email) navigate("/register", { replace: true });
  }, [email, navigate]);

  // Compte à rebours pour le renvoi
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleDigitChange = (index, value) => {
    // Accepter une seule chiffre
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError("");

    // Passer au champ suivant
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quand les 6 chiffres sont remplis
    if (digit && index === 5) {
      const fullCode = [...newDigits.slice(0, 5), digit].join("");
      if (fullCode.length === 6) {
        submitCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();

    if (pasted.length === 6) {
      submitCode(pasted);
    }
  };

  useEffect(() => {
    if (!success) return;
    if (redirectIn <= 0) {
      navigate("/dashboard", { replace: true });
      return;
    }
    const t = setTimeout(() => setRedirectIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [success, redirectIn, navigate]);

  const submitCode = async (code) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-email", { email, code });
      await loginWithToken(res.data.access_token);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Code incorrect ou expiré");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Entrez les 6 chiffres du code");
      return;
    }
    submitCode(code);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendLoading(true);
    setResendMsg("");
    try {
      await api.post("/auth/resend-verification", { email });
      setResendMsg("Nouveau code envoyé !");
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setResendMsg(err.response?.data?.detail || "Erreur lors du renvoi");
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center text-3xl mx-auto mb-6">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Email vérifié !</h2>
          <p className="text-gray-400 mb-6">
            Votre compte a été activé avec succès.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Redirection vers le tableau de bord dans{" "}
            <span className="text-blue-400 font-semibold">{redirectIn}s</span>…
          </p>
          <button
            onClick={() => navigate("/dashboard", { replace: true })}
            className="w-full bg-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Accéder maintenant
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-blue-900/40 border-2 border-blue-500 flex items-center justify-center text-2xl mx-auto mb-4">
            ✉
          </div>
          <h2 className="text-2xl font-bold text-white">Vérification de l'email</h2>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">
            Un code à 6 chiffres a été envoyé à
          </p>
          <p className="text-blue-400 text-sm font-medium mt-1">{email}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Code inputs */}
        <form onSubmit={handleManualSubmit}>
          <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 bg-slate-800 text-white outline-none transition-colors ${
                  digit
                    ? "border-blue-500"
                    : "border-slate-700 focus:border-blue-500"
                }`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || digits.join("").length !== 6}
            className="w-full bg-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Vérification…
              </span>
            ) : (
              "Vérifier le code"
            )}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-6 text-center">
          {resendMsg && (
            <p className={`text-sm mb-3 ${
              resendMsg.includes("envoyé") ? "text-green-400" : "text-red-400"
            }`}>
              {resendMsg}
            </p>
          )}
          <p className="text-gray-400 text-sm">
            Vous n'avez pas reçu le code ?{" "}
            {countdown > 0 ? (
              <span className="text-gray-500">
                Renvoyer dans {countdown}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-blue-400 hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Envoi…" : "Renvoyer"}
              </button>
            )}
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-xs text-gray-500 hover:text-gray-400">
            ← Modifier l'adresse email
          </Link>
        </div>
      </div>
    </div>
  );
}
