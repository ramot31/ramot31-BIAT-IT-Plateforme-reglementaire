import os
import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

SYSTEM_PROMPT = """Tu es un assistant expert en réglementations bancaires tunisiennes pour la plateforme BIAT IT.
Tu aides les professionnels (comptables, avocats, risk managers, auditeurs internes) à comprendre les textes réglementaires officiels.

INSTRUCTIONS IMPÉRATIVES :
1. Base-toi EXCLUSIVEMENT sur les extraits fournis dans le CONTEXTE ci-dessous.
2. Si l'information n'est pas dans le contexte, réponds UNIQUEMENT cette phrase exacte : "Je ne trouve pas cette information dans les documents disponibles." STOP. N'ajoute rien d'autre, n'invente pas, ne déduis pas.
3. Réponds TOUJOURS en français, de façon détaillée et structurée.
4. CITE systématiquement la source exacte : nom du document et page (ex: "Selon la circulaire Cir_2022_05, page 3...").
5. Organise ta réponse avec des sections claires si la réponse est longue (utilise des titres courts).
6. Explique le contenu réglementaire de façon complète : contexte, obligations, conditions, délais, sanctions si mentionnés.
7. Si plusieurs circulaires traitent du même sujet, compare-les et indique les évolutions.
8. Ne résume pas trop — donne une réponse complète et justifiée.
9. Certains extraits peuvent être en arabe (versions officielles BCT). OBLIGATION : traduis intégralement ces extraits en français dans ta réponse, puis analyse leur contenu. N'écris JAMAIS de texte arabe dans ta réponse finale. Si tu détectes de l'arabe dans le contexte, commence par écrire "[Traduction du document arabe :]" puis traduis fidèlement."""

GENERAL_SYSTEM_PROMPT = """Tu es BIAT Assistant, un assistant intelligent et bienveillant intégré à la plateforme BIAT IT.
Tu peux répondre à toutes sortes de questions : explications générales, aide à la compréhension, discussion, conseils professionnels, et bien sûr les réglementations bancaires tunisiennes.
Réponds toujours en français, de façon claire, utile et amicale.
Sois concis pour les questions simples, détaillé pour les questions complexes.
Si une question porte sur des réglementations bancaires spécifiques, indique que tu peux chercher dans la base documentaire."""


def check_ollama() -> bool:
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def check_model_available() -> bool:
    """Vérifie si le modèle configuré est téléchargé dans Ollama."""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        if r.status_code != 200:
            return False
        models = r.json().get("models", [])
        return any(OLLAMA_MODEL in m.get("name", "") for m in models)
    except Exception:
        return False


def generate_stream(question: str, chunks: list[dict]):
    """Génère la réponse token par token via l'API streaming d'Ollama."""
    import json as _json

    context_parts = []
    for i, c in enumerate(chunks, 1):
        src  = c["metadata"].get("source", "document")
        page = c["metadata"].get("page", "?")
        context_parts.append(
            f"[EXTRAIT {i} — Document : {src} | Page : {page}]\n{c['text']}"
        )
    context = "\n\n" + ("=" * 60) + "\n\n".join(context_parts)
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{'=' * 60}\n"
        f"CONTEXTE — EXTRAITS DES CIRCULAIRES ET RÉGLEMENTATIONS :\n"
        f"{context}\n\n"
        f"{'=' * 60}\n"
        f"QUESTION : {question}\n\n"
        f"RÉPONSE DÉTAILLÉE (cite les sources, structure avec des sections si nécessaire) :"
    )

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.15,
                    "num_predict": 2048,
                    "top_p": 0.9,
                    "num_ctx": 4096,
                    "repeat_penalty": 1.1,
                },
            },
            timeout=(15, 600),
            stream=True,
        )
        response.raise_for_status()
        for line in response.iter_lines():
            if line:
                data = _json.loads(line)
                token = data.get("response", "")
                if token:
                    yield token
                if data.get("done"):
                    break
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Ollama n'est pas démarré. Lancez 'ollama serve' dans un terminal.")
    except Exception as e:
        raise RuntimeError(f"Erreur Ollama streaming : {e}")


def generate(question: str, chunks: list[dict]) -> str:
    context_parts = []
    for i, c in enumerate(chunks, 1):
        src = c["metadata"].get("source", "document")
        page = c["metadata"].get("page", "?")
        context_parts.append(
            f"[EXTRAIT {i} — Document : {src} | Page : {page}]\n"
            f"{c['text']}"
        )

    context = "\n\n" + ("=" * 60) + "\n\n".join(context_parts)

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{'=' * 60}\n"
        f"CONTEXTE — EXTRAITS DES CIRCULAIRES ET RÉGLEMENTATIONS :\n"
        f"{context}\n\n"
        f"{'=' * 60}\n"
        f"QUESTION : {question}\n\n"
        f"RÉPONSE DÉTAILLÉE (cite les sources, structure avec des sections si nécessaire) :"
    )

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.15,
                    "num_predict": 2048,
                    "top_p": 0.9,
                    "num_ctx": 4096,
                    "repeat_penalty": 1.1,
                },
            },
            timeout=(15, 600),
        )
        response.raise_for_status()
        return response.json()["response"].strip()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Ollama n'est pas démarré. Lancez 'ollama serve' dans un terminal."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError(
            "Ollama met trop de temps à répondre. "
            "Le modèle est peut-être trop lourd pour votre machine."
        )
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 500:
            body = ""
            try:
                body = e.response.json().get("error", "")
            except Exception:
                pass
            raise RuntimeError(
                f"Erreur interne Ollama (500). "
                f"Vérifiez que le modèle est bien chargé : ollama run {OLLAMA_MODEL}. "
                f"Détail : {body}"
            )
        raise RuntimeError(f"Erreur Ollama : {e}")
    except Exception as e:
        raise RuntimeError(f"Erreur inattendue : {e}")


def chat_stream(question: str):
    """Conversation générale sans contexte RAG — réponse libre d'Ollama."""
    import json as _json

    prompt = f"{GENERAL_SYSTEM_PROMPT}\n\nUtilisateur : {question}\n\nAssistant :"
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 1024,
                    "top_p": 0.9,
                    "num_ctx": 2048,
                },
            },
            timeout=(15, 300),
            stream=True,
        )
        response.raise_for_status()
        for line in response.iter_lines():
            if line:
                data = _json.loads(line)
                token = data.get("response", "")
                if token:
                    yield token
                if data.get("done"):
                    break
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Ollama n'est pas démarré. Lancez 'ollama serve' dans un terminal.")
    except Exception as e:
        raise RuntimeError(f"Erreur Ollama : {e}")


def chat(question: str) -> str:
    """Conversation générale sans contexte RAG."""
    prompt = f"{GENERAL_SYSTEM_PROMPT}\n\nUtilisateur : {question}\n\nAssistant :"
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 1024,
                    "top_p": 0.9,
                    "num_ctx": 2048,
                },
            },
            timeout=(15, 300),
        )
        response.raise_for_status()
        return response.json()["response"].strip()
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Ollama n'est pas démarré. Lancez 'ollama serve' dans un terminal.")
    except Exception as e:
        raise RuntimeError(f"Erreur inattendue : {e}")
