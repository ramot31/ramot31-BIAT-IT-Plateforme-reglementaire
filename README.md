# BIAT IT — Plateforme Réglementaire Bancaire

Plateforme interne pour la gestion, la consultation et l'analyse des réglementations bancaires tunisiennes. Intègre un chatbot RAG *(Retrieval-Augmented Generation)* multilingue basé sur les circulaires de la Banque Centrale de Tunisie.

---

## Fonctionnalités

- **Réglementations** — consultation, recherche, filtrage par catégorie/statut/date
- **Scraping automatique BCT** — import des nouvelles circulaires depuis bct.gov.tn toutes les 6h
- **Notes internes** — l'admin peut créer des notes internes BIAT (type `interne`)
- **Chatbot IA** — RAG sur les documents BCT + conversation générale via Ollama
- **Notifications temps réel** — WebSocket (nouveau document, nouveau message, réponse)
- **Messagerie admin** — système de tickets utilisateur ↔ admin
- **Gestion des utilisateurs** — rôles, activation, administration

---

## Stack Technique

| Couche | Technologies |
|---|---|
| **Backend** | FastAPI · PostgreSQL · SQLAlchemy · Alembic-free migrations |
| **Frontend** | React 19 · Vite · Tailwind CSS v4 |
| **IA / RAG** | Ollama `llama3.2` · ChromaDB · `paraphrase-multilingual-MiniLM-L12-v2` |
| **Scraping** | BeautifulSoup4 · requests |
| **Temps réel** | WebSocket natif FastAPI |
| **Auth** | JWT (python-jose) · bcrypt |

---

## Prérequis

- **Python** 3.11+
- **Node.js** 18+
- **PostgreSQL** 14+
- **Ollama** — [ollama.com](https://ollama.com)
- **Compte Groq** (gratuit) — [console.groq.com](https://console.groq.com)

---

## Installation

### 1. Cloner le projet

```bash
git clone https://github.com/ramot31/ramot31-BIAT-IT-Plateforme-reglementaire.git
cd ramot31-BIAT-IT-Plateforme-reglementaire
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

---

## Configuration

Copier le fichier d'exemple et remplir les valeurs :

```bash
cp backend/.env.example backend/.env
```

Contenu du `.env` à compléter :

```env
# Base de données PostgreSQL
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/biat_it

# Clé secrète JWT (générer une chaîne aléatoire longue)
SECRET_KEY=changez-cette-cle-en-production

# Ollama (modèle local)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest

# Groq API — nettoyage des requêtes avant recherche vectorielle
# Clé gratuite sur https://console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# SMTP (optionnel — laisser vide pour afficher les codes en console)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Proxy d'entreprise (optionnel)
# HTTP_PROXY=http://proxy.entreprise.com:8080
```

---

## Base de données

Créer la base PostgreSQL avant le premier lancement :

```sql
CREATE DATABASE biat_it;
```

Les tables sont créées automatiquement au démarrage du serveur (`Base.metadata.create_all` + migrations).

---

## Modèle IA (Ollama)

```bash
# Installer Ollama puis télécharger le modèle
ollama pull llama3.2
```

---

## Lancement

### Backend

```bash
cd backend
venv\Scripts\activate        # Windows
uvicorn main:app --reload
```

### Frontend *(dans un autre terminal)*

```bash
cd frontend
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## Structure du projet

```
BIAT-IT-Plateforme/
├── backend/
│   ├── main.py               # Point d'entrée FastAPI + scheduler scraping
│   ├── models.py             # Modèles SQLAlchemy
│   ├── schemas.py            # Schémas Pydantic
│   ├── auth.py               # Authentification JWT
│   ├── database.py           # Connexion PostgreSQL
│   ├── migration.py          # Migrations ALTER TABLE au démarrage
│   ├── notif.py              # Notifications (DB + WebSocket)
│   ├── ws_manager.py         # Gestionnaire connexions WebSocket
│   ├── email_service.py      # Envoi d'emails (vérification compte)
│   ├── rag/
│   │   ├── pipeline.py       # Logique RAG : routing + recherche + LLM
│   │   ├── llm.py            # Interface Ollama (RAG + chat général)
│   │   ├── embedder.py       # Embeddings multilingues (sentence-transformers)
│   │   ├── vectorstore.py    # Base vectorielle ChromaDB
│   │   └── query_cleaner.py  # Nettoyage des requêtes via Groq API
│   ├── routers/
│   │   ├── auth.py           # Login, register, vérification email
│   │   ├── regulations.py    # CRUD réglementations + scrape manuel
│   │   ├── chatbot.py        # Chat, streaming, historique, ingestion
│   │   ├── contact.py        # Messagerie utilisateur ↔ admin
│   │   ├── users.py          # Profil, gestion utilisateurs
│   │   ├── admin.py          # Statistiques admin
│   │   ├── categories.py     # Catégories de réglementations
│   │   └── ws.py             # WebSocket + notifications
│   ├── scraper/
│   │   └── bct_scraper.py    # Scraping automatique bct.gov.tn
│   └── .env.example          # Modèle de configuration
└── frontend/
    └── src/
        ├── pages/            # Pages React (Regulations, Chatbot, Admin…)
        ├── components/       # Layout, Navbar, Sidebar, Notifications
        ├── context/          # AuthContext, NotificationContext (WebSocket)
        └── services/         # Client Axios
```

---

## Notes importantes

### Documents BCT
Le dossier `backend/documents/` (~250 Mo de PDFs) n'est pas inclus dans le repo.  
Pour indexer des documents dans le chatbot : **Interface admin → Chatbot → Importer un document**.

### Scraping BCT
Le scraper tente de se connecter à `bct.gov.tn` toutes les 6 heures automatiquement.  
Sur un réseau d'entreprise avec proxy, configurer `HTTP_PROXY` dans le `.env`.  
Un déclenchement manuel est disponible dans l'interface admin via le bouton **"Importer depuis BCT"**.

### Chatbot — modes de fonctionnement
- **Question réglementaire** (circulaire, BCT, fonds propres…) → recherche dans ChromaDB + réponse citant les sources
- **Question générale** → conversation libre avec Ollama sans contexte documentaire
- **Small-talk** (bonjour, merci…) → réponse instantanée prédéfinie

---

## Développé dans le cadre d'un stage à BIAT — 2026
