"""
Nettoyage de prompt via Groq avant la recherche vectorielle.
Extrait les mots-clés essentiels pour améliorer le recall ChromaDB.
Utilise l'API REST Groq (compatible OpenAI) via requests.
Fallback silencieux sur la question originale si Groq indisponible.
"""
import os
import time
import logging
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)

GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"

_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

if _API_KEY:
    print(f"[QueryCleaner] Groq activé — modèle : {GROQ_MODEL}")
else:
    print("[QueryCleaner] GROQ_API_KEY non définie — nettoyage désactivé")

_SYSTEM_PROMPT = """\
Tu es un extracteur de requête pour un moteur de recherche documentaire bancaire tunisien.

Ta tâche : extraire les mots-clés essentiels de la question utilisateur pour optimiser la recherche vectorielle.

Règles STRICTES :
- Garde les numéros de référence tels quels (ex: 2023-26, 2022-05, 131, 2024_131)
- Garde les termes techniques réglementaires (LCR, NSFR, ratio, liquidité, fonds propres, solvabilité, Bâle, BCT, etc.)
- Supprime les formules de politesse, verbes introductifs et mots vides
- Réponds avec UNIQUEMENT les mots-clés séparés par des espaces, sans ponctuation excessive
- Maximum 15 mots
- Réponds en français

Exemples :
Q: "Bonjour, pouvez-vous m'expliquer les exigences de la BCT concernant le ratio LCR ?"
R: exigences BCT ratio liquidité LCR banques

Q: "la note 2023-26 parle de quoi exactement ?"
R: contenu note BCT 2023-26

Q: "Quelles sont les sanctions prévues en cas de non-respect des ratios de solvabilité ?"
R: sanctions non-respect ratios solvabilité BCT

Q: "comment calculer les fonds propres réglementaires selon la circulaire 2014-14 ?"
R: calcul fonds propres réglementaires circulaire 2014-14\
"""


def clean(question: str) -> str:
    """
    Nettoie la question via l'API REST Groq pour optimiser la recherche vectorielle.
    Retourne la question originale si Groq indisponible (fallback silencieux).
    """
    if not _API_KEY:
        return question

    try:
        t0 = time.time()
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": question},
                ],
                "max_tokens": 60,
                "temperature": 0.0,
            },
            timeout=5,
        )
        resp.raise_for_status()
        cleaned = resp.json()["choices"][0]["message"]["content"].strip()
        elapsed = int((time.time() - t0) * 1000)
        if cleaned:
            print(f"[QueryCleaner] {elapsed}ms | '{question[:60]}' → '{cleaned}'")
            return cleaned
    except Exception as e:
        logger.warning(f"[QueryCleaner] Erreur Groq : {e} — fallback question originale")

    return question
