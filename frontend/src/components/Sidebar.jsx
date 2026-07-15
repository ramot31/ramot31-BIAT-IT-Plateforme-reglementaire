import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white h-screen p-6">
      <h1 className="text-2xl font-bold mb-10">BIAT IT</h1>

      <nav className="space-y-4">
        <Link to="/dashboard" className="block hover:text-blue-300">
          Dashboard
        </Link>

        <Link to="/regulations" className="block hover:text-blue-300">
          Réglementations
        </Link>

        <Link to="/chatbot" className="block hover:text-blue-300">
          Assistant IA
        </Link>

        <Link to="/profile" className="block hover:text-blue-300">
          Profil
        </Link>
      </nav>
    </aside>
  );
}