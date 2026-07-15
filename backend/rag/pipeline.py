import re
import unicodedata
import uuid
from io import BytesIO

import pdfplumber

from rag import embedder, vectorstore, llm, query_cleaner

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

RAG_RELEVANCE_THRESHOLD = 0.55

_RAG_TRIGGER_KEYWORDS: frozenset[str] = frozenset({
    "bct", "banque centrale de tunisie", "banque centrale tunisienne",
    "banques tunisiennes", "etablissement de credit", "intermediaire agree",
    # Types de documents
    "circulaire", "note circulaire", "instruction", "reglementation",
    "texte reglementaire", "texte legislatif", "decret", "arrete",
    # Concepts prudentiels/réglementaires
    "fonds propres", "ratio de solvabilite", "ratio de liquidite", "ratio de capitalisation",
    "lcr", "nsfr", "tier 1", "tier 2", "bale iii", "bale ii", "bale",
    "cooke", "solvabilite", "adequation des fonds",
    "refinancement", "appel d offres", "prise en pension", "escompte",
    "reserve obligatoire", "reserve minimale",
    "risque systemique", "stress test",
    "capital reglementaire", "ponderation",
    # Termes spécifiques BCT
    "gouverneur", "conseil d administration bct",
    "dinar tunisien", "taux directeur bct",
    "agrement bancaire", "autorisation bct",
})


def _is_rag_question(question: str) -> bool:
    """Retourne True si la question contient des mots-clés réglementaires BCT."""
    q = _strip_accents(question).lower()
    return any(kw in q for kw in _RAG_TRIGGER_KEYWORDS)


def _has_relevant_context(chunks: list[dict]) -> bool:
    """Retourne True si au moins un chunk est suffisamment pertinent pour la question."""
    if not chunks:
        return False
    return any(c.get("distance", 1.0) < RAG_RELEVANCE_THRESHOLD for c in chunks)


def _strip_accents(text: str) -> str:
    """Normalise le texte : minuscules + suppression des accents."""
    return unicodedata.normalize("NFD", text).encode("ascii", "ignore").decode("ascii").lower()


_CASUAL_RESPONSES = {
    "greeting": (
        "Bonjour ! Je suis BIAT Assistant, votre assistant IA.\n\n"
        "Je peux vous aider sur les réglementations bancaires tunisiennes (circulaires BCT, notes, textes officiels) "
        "mais aussi répondre à des questions générales ou simplement discuter.\n\n"
        "Comment puis-je vous aider ?"
    ),
    "how_are_you": (
        "Je vais très bien, merci de demander ! 😊\n\n"
        "Et vous ? Puis-je vous aider avec quelque chose aujourd'hui ?"
    ),
    "thanks": "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.",
    "bye": "Bonne journée ! Je reste disponible si vous avez besoin de moi.",
    "ok": "D'accord ! Posez-moi votre question, je suis là pour vous aider.",
}

# Mots normalisés (sans accents) pour chaque catégorie
_GREETING_WORDS  = {"bonjour", "bonsoir", "salut", "hello", "hi", "coucou", "salam", "hey"}
_THANKS_WORDS    = {"merci", "thank", "thanks"}
_BYE_WORDS       = {"au revoir", "bye", "bonne continuation", "a bientot",
                    "bonne journee", "bonne soiree", "bonne nuit", "bonne matinee",
                    "bonne fin", "bonne route"}
_OK_WORDS        = {"ok", "okay", "d accord", "daccord", "super", "parfait",
                    "tres bien", "ca marche", "oui", "non", "c est bon", "cest bon", "rien"}
_HOW_ARE_YOU     = {"comment cava", "comment ca va", "comment vas-tu", "comment tu vas",
                    "ca va", "cava", "comment allez-vous", "comment vous allez",
                    "tu vas bien", "vous allez bien", "ca va bien", "tout va bien"}


def _casual_response(question: str) -> str | None:
    """Retourne une réponse directe si la question est du small-talk, sinon None."""
    q_raw = question.strip()
    # Ignore les messages trop longs (>80 chars = probablement une vraie question)
    if len(q_raw) > 80:
        return None

    q = _strip_accents(q_raw).rstrip("!?. ,")

    if any(q == w or q.startswith(w + " ") for w in _THANKS_WORDS):
        return _CASUAL_RESPONSES["thanks"]
    if q in _HOW_ARE_YOU or any(q.startswith(w) for w in _HOW_ARE_YOU):
        return _CASUAL_RESPONSES["how_are_you"]
    if any(q == w or q == w.rstrip("!") for w in _BYE_WORDS):
        return _CASUAL_RESPONSES["bye"]
    if q in _GREETING_WORDS:
        return _CASUAL_RESPONSES["greeting"]
    if q in _OK_WORDS:
        return _CASUAL_RESPONSES["ok"]

    # Expressions composées (bonne journée, bonne soirée, etc.)
    if re.match(r"^bonne\s+(journee|soiree|nuit|matinee|continuation|fin|route|semaine)$", q):
        return _CASUAL_RESPONSES["bye"]

    return None

# Pattern: numéros de référence comme "2024-131", "2022-05", "131", "2024_131"
_REF_PATTERN = re.compile(r'\b(\d{4}[-_]\d+|\d{3,4})\b')


def _find_reference_chunks(
    question: str, q_vec: list[float], max_per_source: int = 6
) -> list[dict]:
    """
    Cherche les documents correspondant à des numéros de référence dans la question,
    puis sélectionne les chunks les plus pertinents sémantiquement dans chaque document.
    Inclut les documents arabes — aya:8b les lit nativement.
    """
    numbers = _REF_PATTERN.findall(question)
    if not numbers:
        return []

    ref_chunks: list[dict] = []
    seen_sources: set[str] = set()

    for num in numbers:
        matched = vectorstore.find_sources_by_pattern(num)
        for src in matched:
            if src in seen_sources:
                continue
            seen_sources.add(src)
            chunks = vectorstore.search_within_source(q_vec, src, n_results=max_per_source)
            if not chunks:
                chunks = vectorstore.get_chunks_by_source(src, max_chunks=max_per_source)
            ref_chunks.extend(chunks)

    return ref_chunks


def _split_text(text: str, source: str, page: int) -> list[dict]:
    chunks = []
    text = text.strip()
    if not text:
        return chunks

    start = 0
    idx = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append({
                "id": f"{source}_p{page}_c{idx}_{uuid.uuid4().hex[:6]}",
                "text": chunk,
                "metadata": {"source": source, "page": page, "chunk": idx},
            })
            idx += 1
        start = end - CHUNK_OVERLAP

    return chunks


def _embed_and_store(chunks: list[dict]) -> None:
    batch_size = 32
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        embeddings = embedder.embed_batch([c["text"] for c in batch])
        vectorstore.add_chunks(batch, embeddings)


def ingest_pdf(file_bytes: bytes, filename: str) -> int:
    all_chunks: list[dict] = []

    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                all_chunks.extend(_split_text(text, source=filename, page=page_num))

    if not all_chunks:
        raise ValueError("Aucun texte extrait du document PDF.")

    _embed_and_store(all_chunks)
    return len(all_chunks)


def ingest_text(content: str, filename: str) -> int:
    chunks = _split_text(content, source=filename, page=1)
    if not chunks:
        raise ValueError("Document texte vide.")

    _embed_and_store(chunks)
    return len(chunks)


def ask_stream(question: str, n_results: int = 6):
    """Recherche vectorielle + par référence puis streaming LLM. Yield (type, content)."""
    casual = _casual_response(question)
    if casual:
        yield "token", casual
        yield "sources", []
        yield "done", None
        return

    # Pas de mots-clés réglementaires → conversation générale directement (évite faux positifs RAG)
    if not _is_rag_question(question):
        for token in llm.chat_stream(question):
            yield "token", token
        yield "sources", []
        yield "done", None
        return

    search_query    = query_cleaner.clean(question)
    q_vec           = embedder.embed(search_query)
    semantic_chunks = vectorstore.search(q_vec, n_results=n_results)
    ref_chunks      = _find_reference_chunks(search_query, q_vec)

    # Merge: ref_chunks en premier (priorité), puis semantic sans doublons
    seen_ids: set[str] = set()
    chunks: list[dict] = []
    for c in ref_chunks:
        key = (c["metadata"]["source"], c["metadata"].get("chunk", 0))
        if key not in seen_ids:
            seen_ids.add(key)
            chunks.append(c)
    for c in semantic_chunks:
        key = (c["metadata"]["source"], c["metadata"].get("chunk", 0))
        if key not in seen_ids:
            seen_ids.add(key)
            chunks.append(c)

    if not _has_relevant_context(chunks):
        for token in llm.chat_stream(question):
            yield "token", token
        yield "sources", []
        yield "done", None
        return

    seen_src: set[tuple] = set()
    sources = []
    for c in chunks:
        key = (c["metadata"]["source"], c["metadata"]["page"])
        if key not in seen_src:
            seen_src.add(key)
            sources.append({
                "document": c["metadata"]["source"],
                "page":     c["metadata"]["page"],
                "score":    round(max(0.0, 1.0 - c["distance"]), 2),
            })

    for token in llm.generate_stream(question, chunks):
        yield "token", token

    yield "sources", sources
    yield "done", None


def ask(question: str, n_results: int = 6) -> dict:
    casual = _casual_response(question)
    if casual:
        return {"answer": casual, "sources": []}

    if not _is_rag_question(question):
        return {"answer": llm.chat(question), "sources": []}

    search_query    = query_cleaner.clean(question)
    q_vec           = embedder.embed(search_query)
    semantic_chunks = vectorstore.search(q_vec, n_results=n_results)
    ref_chunks      = _find_reference_chunks(search_query, q_vec)

    seen_ids: set[str] = set()
    chunks: list[dict] = []
    for c in ref_chunks:
        key = (c["metadata"]["source"], c["metadata"].get("chunk", 0))
        if key not in seen_ids:
            seen_ids.add(key)
            chunks.append(c)
    for c in semantic_chunks:
        key = (c["metadata"]["source"], c["metadata"].get("chunk", 0))
        if key not in seen_ids:
            seen_ids.add(key)
            chunks.append(c)

    if not _has_relevant_context(chunks):
        return {"answer": llm.chat(question), "sources": []}

    answer = llm.generate(question, chunks)

    seen_src: set[tuple] = set()
    sources = []
    for c in chunks:
        key = (c["metadata"]["source"], c["metadata"]["page"])
        if key not in seen_src:
            seen_src.add(key)
            sources.append({
                "document": c["metadata"]["source"],
                "page": c["metadata"]["page"],
                "score": round(max(0.0, 1.0 - c["distance"]), 2),
            })

    return {"answer": answer, "sources": sources}
