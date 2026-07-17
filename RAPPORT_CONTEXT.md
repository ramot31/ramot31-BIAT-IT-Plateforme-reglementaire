# Contexte technique complet — Rapport de Stage BIAT IT 2026

> Ce document est destiné à être fourni à un LLM pour générer le code LaTeX d'un rapport de stage.
> Il contient l'intégralité des informations techniques, architecturales et contextuelles du projet.

---

## 1. Informations générales

- **Stagiaire** : Omar Trigui
- **Entreprise** : BIAT — Banque Internationale Arabe de Tunisie
- **Département** : Direction des Systèmes d'Information (DSI / IT)
- **Période** : 2026
- **Intitulé du stage** : Développement d'une plateforme de gestion et d'analyse des réglementations bancaires avec chatbot IA
- **Technologies principales** : FastAPI · React 19 · PostgreSQL · ChromaDB · Ollama · RAG

---

## 2. Contexte et problématique

### 2.1 Présentation de BIAT

La BIAT (Banque Internationale Arabe de Tunisie) est l'une des premières banques privées tunisiennes. Elle opère dans un environnement fortement réglementé par la Banque Centrale de Tunisie (BCT), qui publie régulièrement des circulaires, notes et textes législatifs que les équipes internes (comptabilité, audit, risk management, juridique) doivent connaître et appliquer.

### 2.2 Problème identifié

Les réglementations BCT sont publiées en PDF sur le site bct.gov.tn de manière non structurée. Les équipes métier :
- Doivent surveiller manuellement les nouvelles publications
- N'ont pas d'outil centralisé pour rechercher dans l'ensemble des circulaires
- Ne peuvent pas poser des questions en langage naturel sur le contenu réglementaire
- Manquent d'un espace pour annoter les documents avec des notes internes BIAT

### 2.3 Solution développée

Une plateforme web interne qui :
1. **Centralise** toutes les réglementations BCT (auto-scrapées) et les notes internes BIAT
2. **Indexe** les PDFs dans une base vectorielle pour la recherche sémantique
3. **Intègre un chatbot IA** capable de répondre à des questions sur les réglementations en citant les sources
4. **Notifie** les équipes en temps réel à chaque nouvelle publication BCT
5. **Permet** aux admins d'annoter les réglementations avec des notes privées

---

## 3. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React 19)                         │
│  Pages : Regulations · RegulationDetail · Chatbot · Admin · ...  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP REST + WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                    BACKEND (FastAPI / Python)                     │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Routers    │  │   Auth JWT   │  │  WebSocket Manager     │ │
│  │ regulations  │  │   bcrypt     │  │  (temps réel)          │ │
│  │ chatbot      │  └──────────────┘  └────────────────────────┘ │
│  │ contact      │                                                 │
│  │ users/admin  │  ┌──────────────────────────────────────────┐  │
│  └──────────────┘  │           RAG Pipeline                   │  │
│                    │  query_cleaner → embedder → vectorstore   │  │
│                    │  keyword routing → llm (Ollama)           │  │
│                    └──────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────────────────────────┐  │
│  │  BCT Scraper    │  │        Scheduler asyncio              │  │
│  │  (BeautifulSoup)│  │  (scraping toutes les 6 heures)      │  │
│  └─────────────────┘  └──────────────────────────────────────┘  │
└─────────────┬───────────────────────────────────┬───────────────┘
              │ SQLAlchemy ORM                     │ ChromaDB
┌─────────────▼──────────┐           ┌─────────────▼──────────────┐
│   PostgreSQL            │           │   ChromaDB (vecteurs)       │
│   (données métier)      │           │   (embeddings PDF)          │
└─────────────────────────┘           └────────────────────────────┘
                                                    │
                                       ┌────────────▼──────────────┐
                                       │   Ollama (llama3.2)        │
                                       │   localhost:11434          │
                                       └───────────────────────────┘
```

---

## 4. Stack technique détaillée

### Backend
| Composant | Technologie | Version |
|---|---|---|
| Framework API | FastAPI | 0.111+ |
| ORM | SQLAlchemy | 2.x |
| Base de données | PostgreSQL | 14+ |
| Auth | python-jose (JWT) + bcrypt | — |
| Serveur ASGI | Uvicorn | — |
| Validation | Pydantic v2 | — |
| WebSocket | FastAPI natif | — |
| Scraping | BeautifulSoup4 + requests | — |

### Frontend
| Composant | Technologie | Version |
|---|---|---|
| Framework | React | 19 |
| Build tool | Vite | 5+ |
| CSS | Tailwind CSS | v4 |
| Client HTTP | Axios | — |
| Routing | React Router v6 | — |

### Intelligence Artificielle
| Composant | Technologie |
|---|---|
| LLM local | Ollama avec llama3.2:latest |
| Embeddings | paraphrase-multilingual-MiniLM-L12-v2 (sentence-transformers) |
| Base vectorielle | ChromaDB (espace cosinus) |
| Nettoyage requêtes | Groq API (llama-3.1-8b-instant) via REST |

---

## 5. Modèle de données (PostgreSQL)

### Table `users`
```sql
id              SERIAL PRIMARY KEY
email           VARCHAR UNIQUE NOT NULL
hashed_password VARCHAR NOT NULL
nom             VARCHAR NOT NULL
prenom          VARCHAR NOT NULL
role            VARCHAR NOT NULL  -- 'admin' | 'comptable' | 'auditeur' | 'risk_manager' | 'avocat' | 'autre'
is_active       BOOLEAN DEFAULT TRUE
is_verified     BOOLEAN DEFAULT FALSE
verification_code VARCHAR
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Table `regulations`
```sql
id                  SERIAL PRIMARY KEY
titre               VARCHAR NOT NULL
reference           VARCHAR
description         TEXT
organisme_emetteur  VARCHAR
categorie_id        INTEGER REFERENCES categories(id)
date_publication    DATE
statut              VARCHAR  -- 'nouveau' | 'actif' | 'archive'
fichier_pdf         VARCHAR  -- nom du fichier local dans uploads/
mots_cles           VARCHAR
roles_concernes     VARCHAR  -- ex: 'comptable,auditeur'
source              VARCHAR DEFAULT 'interne'  -- 'bct' | 'interne'
bct_url             VARCHAR  -- URL source sur bct.gov.tn
note_interne        TEXT     -- note privée admin (non visible aux utilisateurs)
created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Table `categories`
```sql
id          SERIAL PRIMARY KEY
nom         VARCHAR NOT NULL
description TEXT
```

### Table `chat_history`
```sql
id         SERIAL PRIMARY KEY
user_id    INTEGER REFERENCES users(id)
question   TEXT NOT NULL
answer     TEXT NOT NULL
sources    JSONB  -- liste des documents sources utilisés
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Table `contact_messages`
```sql
id         SERIAL PRIMARY KEY
user_id    INTEGER REFERENCES users(id)
sujet      VARCHAR NOT NULL
message    TEXT NOT NULL
reponse    TEXT
lu         BOOLEAN DEFAULT FALSE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
repondu_at TIMESTAMP WITH TIME ZONE
```

### Table `notifications`
```sql
id         SERIAL PRIMARY KEY
user_id    INTEGER REFERENCES users(id)
type       VARCHAR  -- 'new_regulation' | 'new_message' | 'new_reply'
payload    JSONB
lu         BOOLEAN DEFAULT FALSE
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 6. API REST — Endpoints principaux

### Auth (`/auth`)
- `POST /auth/register` — inscription utilisateur
- `POST /auth/login` — connexion, retourne JWT
- `POST /auth/verify-email` — vérification par code

### Réglementations (`/regulations`)
- `GET /regulations/` — liste avec filtres (search, categorie_id, statut, date)
- `GET /regulations/{id}` — détail d'une réglementation
- `POST /regulations/` — création (admin)
- `PUT /regulations/{id}` — modification (admin)
- `DELETE /regulations/{id}` — suppression (admin)
- `POST /regulations/{id}/upload` — upload PDF (admin)
- `POST /regulations/scrape` — déclenche scraping BCT manuel (admin)

### Chatbot (`/chatbot`)
- `POST /chatbot/chat` — question → réponse (non-streaming)
- `POST /chatbot/stream` — question → réponse en streaming SSE
- `GET /chatbot/history` — historique des conversations
- `DELETE /chatbot/history` — effacer l'historique
- `POST /chatbot/ingest` — indexer un PDF dans ChromaDB (admin)
- `GET /chatbot/status` — statut Ollama + statistiques vectorstore

### Contact (`/contact`)
- `POST /contact/` — envoyer un message à l'admin
- `GET /contact/me` — mes messages + réponses
- `GET /contact/` — tous les messages (admin)
- `PUT /contact/{id}/repondre` — répondre (admin)

### Notifications (`/notifications`)
- `GET /notifications` — notifications non lues
- `PUT /notifications/lues` — marquer tout comme lu
- `WebSocket /ws?token=JWT` — connexion temps réel

---

## 7. Pipeline RAG (Retrieval-Augmented Generation)

### 7.1 Ingestion des documents

```
PDF → pdfplumber (extraction texte) → découpage en chunks (800 chars, overlap 150)
    → sentence-transformers embed_batch → ChromaDB (stockage vecteurs)
```

### 7.2 Traitement d'une question (ask_stream)

```
Question utilisateur
        │
        ▼
[1] Détection small-talk (_casual_response)
    Mots reconnus : bonjour, merci, au revoir, comment ça va...
    → Réponse instantanée prédéfinie (pas d'appel LLM)
        │
        ▼ (si pas small-talk)
[2] Détection mots-clés réglementaires (_is_rag_question)
    Frozenset de ~40 termes : bct, circulaire, fonds propres, bale, lcr, nsfr...
    → Si absent : conversation générale directe avec Ollama (temp=0.7)
        │
        ▼ (si mots-clés présents)
[3] Nettoyage de la requête via Groq API (llama-3.1-8b-instant)
    Supprime le bruit, reformule pour meilleure recherche vectorielle
        │
        ▼
[4] Embedding de la requête nettoyée
    paraphrase-multilingual-MiniLM-L12-v2
        │
        ▼
[5] Recherche dans ChromaDB
    - Recherche sémantique (cosinus) : 6 chunks les plus proches
    - Recherche par référence : détection regex de numéros (2024-131, 2022-05...)
      → récupère les chunks du document correspondant
    - Fusion et déduplication des deux listes
        │
        ▼
[6] Vérification de pertinence (_has_relevant_context)
    Si distance cosinus > 0.55 pour tous les chunks
    → Conversation générale avec Ollama (temp=0.7)
        │
        ▼ (si contexte pertinent)
[7] Génération via Ollama llama3.2 (temp=0.15, num_predict=2048)
    Prompt structuré avec extraits + instructions strictes :
    - Citer les sources
    - Ne pas inventer
    - Traduire l'arabe en français si présent
    - Réponse détaillée et structurée
        │
        ▼
[8] Streaming SSE vers le frontend
    + Sources retournées (document, page, score)
```

### 7.3 Décision de routage (problème clé résolu)

**Problème** : Le modèle d'embedding multilingue donne des distances cosinus similaires (~0.30-0.45) entre du texte conversationnel français et des documents réglementaires français. Une question comme "c'est quoi la BCE ?" déclenchait une recherche RAG et produisait des hallucinations (citations de circulaires inexistantes).

**Solution** : Routage en deux couches :
1. **Détection par mots-clés** (couche 1, déterministe) : si la question ne contient aucun terme réglementaire BCT → conversation générale directe, ChromaDB non sollicité
2. **Seuil de distance** (couche 2, pour les vraies questions réglementaires) : si aucun chunk n'a une distance < 0.55 → conversation générale

---

## 8. Scraper BCT

### 8.1 Fonctionnement

Le scraper surveille 3 pages du site BCT :
- `https://www.bct.gov.tn/bct/siteprod/circulaires.jsp`
- `https://www.bct.gov.tn/bct/siteprod/textes.jsp`
- `https://www.bct.gov.tn/bct/siteprod/notes.jsp`

Pour chaque lien PDF trouvé :
1. Vérification de déduplication par `bct_url` en base
2. Extraction du titre depuis le texte du lien / conteneur parent
3. Extraction de la date de publication (regex sur le texte et l'URL)
4. Téléchargement du PDF dans `uploads/` (nom : `bct_{md5hash}_{filename}`)
5. Création d'un enregistrement `Regulation` avec `source="bct"`
6. Notification WebSocket à tous les utilisateurs

### 8.2 Déclenchement

- **Automatique** : toutes les 6 heures via tâche asyncio en arrière-plan (démarre 60s après le lancement du serveur)
- **Manuel** : endpoint `POST /regulations/scrape` (admin uniquement, exécuté en BackgroundTask)

### 8.3 Support proxy d'entreprise

```python
HTTP_PROXY = os.getenv("HTTP_PROXY", "")
PROXIES = {"http": HTTP_PROXY, "https": HTTP_PROXY} if HTTP_PROXY else None
```

Toutes les requêtes HTTP passent par ce proxy si configuré.

---

## 9. Système de notifications temps réel

### Architecture

```
Événement serveur (nouveau doc / message / réponse)
        │
        ▼
notif.py → _save() : persistance en base (table notifications)
         → manager.send_to_user() ou broadcast() : envoi WebSocket
        │
        ▼
ws_manager.py : WsManager
    _connections: dict[user_id, set[WebSocket]]
    _admin_ids: set[int]
    → connect(), disconnect(), send_to_user(), broadcast_all(), broadcast_admins()
        │
        ▼
frontend NotificationContext (React)
    → WebSocket onmessage : mise à jour state + toast 5s
    → Au login : GET /notifications pour charger les non-lues (hors-ligne)
```

### Types de notifications

| Type | Destinataire | Déclencheur |
|---|---|---|
| `new_regulation` | Tous les utilisateurs actifs | Création ou import BCT d'un document |
| `new_message` | Tous les admins | Envoi d'un message par un utilisateur |
| `new_reply` | Utilisateur concerné | Réponse admin à un message |

### Règle d'exclusion admin

Un admin ne reçoit jamais de `new_reply` (c'est lui qui répond). Cette règle est appliquée à 3 niveaux : lors de la création en base, lors du broadcast WebSocket, et au filtrage dans le frontend.

---

## 10. Authentification et sécurité

- **JWT** : tokens HS256, expiration 8 heures, signés avec `SECRET_KEY` (variable d'environnement)
- **Mots de passe** : hachage bcrypt direct (sans passlib — incompatibilité passlib/bcrypt 5.0)
- **Vérification email** : code à 6 chiffres envoyé par SMTP, compte inactif jusqu'à validation
- **Contrôle d'accès** : `get_current_user()` pour les routes authentifiées, `require_admin()` pour les routes admin
- **Filtrage par rôle** : les réglementations peuvent être restreintes à des rôles spécifiques (`roles_concernes`)

---

## 11. Frontend — Pages et fonctionnalités

### Pages publiques
- **Landing** : page d'accueil avec présentation de la plateforme
- **Login / Register** : formulaires avec validation
- **VerifyEmail** : saisie du code de vérification

### Pages utilisateur (authentifié)
- **Dashboard** : statistiques, dernières réglementations, accès rapide
- **Regulations** : liste avec filtres (recherche, catégorie, statut, date) + badges source (BCT / Interne)
- **RegulationDetail** : détail complet, lien PDF, lien bct.gov.tn, note interne (admin uniquement)
- **Chatbot** : interface de conversation avec streaming SSE, suggestions, historique
- **Contact** : formulaire de message + suivi des réponses
- **Profile** : informations personnelles

### Pages admin
- **AdminDashboard** : statistiques globales (utilisateurs, réglementations, catégories)
- **AdminRegulations** : CRUD réglementations + bouton "Importer depuis BCT" + badge source
- **AdminRegulationForm** : formulaire création/édition avec sélecteur source (BCT / Interne), champ `bct_url`, textarea `note_interne`
- **AdminUsers** : gestion des comptes (activation, rôle)
- **AdminCategories** : gestion des catégories
- **AdminContact** : lecture et réponse aux messages utilisateurs

### Composants clés
- **NotificationBell** : cloche avec compteur, dropdown liste des notifications
- **NotificationContext** : gestion WebSocket, reconnexion automatique (retry 3s), chargement hors-ligne
- **Layout / Sidebar** : navigation adaptée au rôle (admin vs utilisateur)

---

## 12. Défis techniques rencontrés et solutions

### 12.1 Incompatibilité bcrypt / passlib

**Problème** : `passlib` v1.7 est incompatible avec `bcrypt` v5.0 (changement d'API interne). Erreur au démarrage lors du hachage des mots de passe.

**Solution** : Utilisation directe de `bcrypt` sans passer par `passlib` :
```python
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
bcrypt.checkpw(password.encode(), hashed.encode())
```

### 12.2 Faux positifs RAG (questions conversationnelles)

**Problème** : Le modèle `paraphrase-multilingual-MiniLM-L12-v2` donne des distances cosinus de 0.30-0.45 entre du texte conversationnel français et des documents réglementaires. Questions comme "c'est quoi la BCE ?" ou "où se situe la BCE ?" déclenchaient RAG → hallucinations.

**Solution** : Ajout d'une couche de détection par mots-clés avant la recherche vectorielle. Si la question ne contient aucun terme du `frozenset` réglementaire (~40 mots : bct, circulaire, fonds propres, bale, lcr...), ChromaDB n'est pas sollicité.

### 12.3 Scraper BCT inaccessible depuis le réseau interne

**Problème** : Le réseau d'entreprise BIAT passe par un proxy et ne permet pas d'accéder directement à bct.gov.tn. `requests` lève `NameResolutionError: getaddrinfo failed`.

**Solution** : Support du proxy d'entreprise via variable d'environnement `HTTP_PROXY` :
```python
HTTP_PROXY = os.getenv("HTTP_PROXY", "")
PROXIES = {"http": HTTP_PROXY, "https": HTTP_PROXY} if HTTP_PROXY else None
```

### 12.4 Scheduler sans dépendance externe

**Problème** : APScheduler ajouterait une dépendance externe et peut causer des conflits avec l'event loop asyncio de FastAPI.

**Solution** : Tâche asyncio native dans le `lifespan` context manager de FastAPI :
```python
async def _scheduled_scrape():
    await asyncio.sleep(60)  # délai démarrage
    while True:
        await run_scrape()
        await asyncio.sleep(6 * 3600)
```

### 12.5 Migrations de base de données sans Alembic

**Problème** : Alembic ajoute de la complexité pour un projet de stage. Les colonnes ajoutées en cours de développement (`source`, `bct_url`, `note_interne`) doivent migrer les données existantes.

**Solution** : Script `migration.py` exécuté au démarrage via `ALTER TABLE IF NOT EXISTS` (idempotent) :
```python
ALTER TABLE regulations
    ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'interne',
    ADD COLUMN IF NOT EXISTS bct_url VARCHAR,
    ADD COLUMN IF NOT EXISTS note_interne TEXT
```

---

## 13. Structure des fichiers

```
BIAT-IT-Plateforme/
├── backend/
│   ├── main.py               # Lifespan, CORS, routers, scheduler
│   ├── models.py             # Modèles SQLAlchemy (User, Regulation, Category, ChatHistory, ContactMessage, Notification)
│   ├── schemas.py            # Schémas Pydantic (In/Out)
│   ├── auth.py               # JWT, get_current_user, require_admin
│   ├── database.py           # engine, SessionLocal, Base
│   ├── migration.py          # ALTER TABLE idempotent
│   ├── notif.py              # notify_user, notify_all_admins, notify_all_users
│   ├── ws_manager.py         # WsManager (connexions WebSocket)
│   ├── email_service.py      # Envoi SMTP (vérification compte)
│   ├── rag/
│   │   ├── pipeline.py       # ask(), ask_stream(), ingest_pdf(), routage RAG
│   │   ├── llm.py            # generate_stream(), chat_stream(), check_ollama()
│   │   ├── embedder.py       # embed(), embed_batch() — MiniLM
│   │   ├── vectorstore.py    # ChromaDB : add_chunks, search, delete_document
│   │   └── query_cleaner.py  # Groq API : reformulation de la question
│   ├── routers/
│   │   ├── auth.py
│   │   ├── regulations.py
│   │   ├── chatbot.py
│   │   ├── contact.py
│   │   ├── users.py
│   │   ├── admin.py
│   │   ├── categories.py
│   │   └── ws.py
│   └── scraper/
│       └── bct_scraper.py
└── frontend/
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        │   ├── Layout.jsx
        │   ├── Navbar.jsx
        │   ├── Sidebar.jsx
        │   ├── NotificationBell.jsx
        │   └── PrivateRoute.jsx
        ├── context/
        │   ├── AuthContext.jsx
        │   └── NotificationContext.jsx
        ├── services/
        │   └── api.js        # Axios instance (baseURL: http://localhost:8000)
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── VerifyEmail.jsx
            ├── Dashboard.jsx
            ├── Regulations.jsx
            ├── RegulationDetail.jsx
            ├── Chatbot.jsx
            ├── Contact.jsx
            ├── Profile.jsx
            └── admin/
                ├── AdminDashboard.jsx
                ├── AdminRegulations.jsx
                ├── AdminRegulationForm.jsx
                ├── AdminUsers.jsx
                ├── AdminCategories.jsx
                └── AdminContact.jsx
```

---

## 14. Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://postgres:0000@localhost:5432/biat_it` |
| `SECRET_KEY` | Clé de signature JWT | `biat-it-secret-key-2026` |
| `OLLAMA_URL` | URL du serveur Ollama | `http://localhost:11434` |
| `OLLAMA_MODEL` | Modèle LLM | `llama3.2:latest` |
| `GROQ_API_KEY` | Clé API Groq | `gsk_xxxx...` |
| `SMTP_HOST` | Serveur mail | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Adresse mail expéditeur | `noreply@biat.com.tn` |
| `SMTP_PASSWORD` | Mot de passe SMTP | — |
| `HTTP_PROXY` | Proxy d'entreprise (optionnel) | `http://proxy:8080` |

---

## 15. Flux utilisateur typiques

### Flux 1 : Consultation d'une réglementation
1. Utilisateur se connecte → JWT stocké en localStorage
2. Accède à `/regulations` → liste chargée depuis `GET /regulations/`
3. Filtres appliqués côté serveur (search, catégorie, statut, date)
4. Clique sur une réglementation → `GET /regulations/{id}`
5. Si `fichier_pdf` → lien vers `GET /uploads/{filename}`
6. Si `bct_url` → lien externe vers bct.gov.tn
7. Si admin et `note_interne` → section note privée affichée

### Flux 2 : Question au chatbot
1. Utilisateur tape une question dans `/chatbot`
2. `POST /chatbot/stream` → SSE streaming
3. Pipeline RAG : small-talk check → keyword check → Groq clean → embed → ChromaDB search → Ollama stream
4. Tokens affichés en temps réel dans l'interface
5. Sources citées affichées sous la réponse
6. Interaction sauvegardée dans `chat_history`

### Flux 3 : Import automatique BCT
1. Scheduler asyncio (toutes les 6h) appelle `run_scrape()`
2. Scraper parcourt les 3 pages BCT
3. Pour chaque PDF non encore en base : téléchargement + création `Regulation`
4. Notification WebSocket envoyée à tous les utilisateurs
5. Toast affiché côté frontend : "Nouveau document ajouté : [titre]"

### Flux 4 : Messagerie admin
1. Utilisateur envoie un message via `/contact`
2. Notification WS envoyée à tous les admins → toast admin
3. Admin ouvre `/admin/contact`, lit et répond
4. Notification WS `new_reply` envoyée à l'utilisateur concerné
5. Utilisateur voit la réponse dans `/contact/me`

---

## 16. Points forts du projet à mettre en valeur dans le rapport

1. **Architecture RAG complète** : pipeline de bout en bout — ingestion PDF, embedding multilingue, recherche sémantique, génération avec sources citées
2. **Routage intelligent** : solution originale au problème des faux positifs RAG par détection de mots-clés réglementaires
3. **Scraping automatique** : veille réglementaire BCT sans intervention manuelle
4. **Deux types de réglementations** : documents BCT officiels + notes internes BIAT, couvrant les besoins métier réels
5. **Temps réel** : système de notifications WebSocket persistant avec fallback hors-ligne
6. **LLM local** : Ollama sur machine locale (pas de données envoyées à un serveur externe), adapté au contexte bancaire et aux contraintes de confidentialité
7. **Support multilingue** : documents BCT parfois en arabe, l'embedding MiniLM est multilingue et le LLM est instruit de traduire
