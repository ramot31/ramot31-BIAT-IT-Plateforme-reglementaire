import os
import chromadb

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection(
            name="regulations",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_chunks(chunks: list[dict], embeddings: list[list[float]]) -> None:
    col = _get_collection()
    col.add(
        ids=[c["id"] for c in chunks],
        embeddings=embeddings,
        documents=[c["text"] for c in chunks],
        metadatas=[c["metadata"] for c in chunks],
    )


def search(embedding: list[float], n_results: int = 4) -> list[dict]:
    col = _get_collection()
    total = col.count()
    if total == 0:
        return []

    results = col.query(
        query_embeddings=[embedding],
        n_results=min(n_results, total),
        include=["documents", "metadatas", "distances"],
    )

    output = []
    for i in range(len(results["ids"][0])):
        output.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })
    return output


def list_documents() -> list[dict]:
    col = _get_collection()
    seen: dict[str, dict] = {}
    batch_size = 1000
    offset = 0
    while True:
        result = col.get(include=["metadatas"], limit=batch_size, offset=offset)
        if not result["metadatas"]:
            break
        for meta in result["metadatas"]:
            src = meta.get("source", "inconnu")
            if src not in seen:
                seen[src] = {"source": src, "chunks": 0, "pages": set()}
            seen[src]["chunks"] += 1
            seen[src]["pages"].add(meta.get("page", 0))
        offset += batch_size
        if len(result["metadatas"]) < batch_size:
            break

    return [
        {
            "source": v["source"],
            "chunks": v["chunks"],
            "pages": len(v["pages"]),
        }
        for v in seen.values()
    ]


def delete_document(source: str) -> int:
    col = _get_collection()
    result = col.get(where={"source": source}, include=[])
    ids = result["ids"]
    if ids:
        col.delete(ids=ids)
    return len(ids)


def total_chunks() -> int:
    return _get_collection().count()


def get_document_text(source: str) -> str:
    """Retourne le texte complet d'un document (tous ses chunks concaténés)."""
    col = _get_collection()
    result = col.get(where={"source": source}, include=["documents"])
    return " ".join(result["documents"])


def get_chunks_by_source(source: str, max_chunks: int = 8) -> list[dict]:
    """Retourne les premiers chunks d'un document triés par page+chunk."""
    col = _get_collection()
    result = col.get(
        where={"source": source},
        include=["documents", "metadatas"],
    )
    output = []
    for i in range(len(result["ids"])):
        output.append({
            "text":     result["documents"][i],
            "metadata": result["metadatas"][i],
            "distance": 0.0,
        })
    output.sort(key=lambda c: (c["metadata"].get("page", 0), c["metadata"].get("chunk", 0)))
    return output[:max_chunks]


def search_within_source(embedding: list[float], source: str, n_results: int = 6) -> list[dict]:
    """Recherche sémantique restreinte à un document spécifique."""
    col = _get_collection()
    count = col.count()
    if count == 0:
        return []
    try:
        results = col.query(
            query_embeddings=[embedding],
            n_results=min(n_results, count),
            where={"source": source},
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        # Fallback si le filtre where échoue (doc pas encore indexé)
        return []
    output = []
    for i in range(len(results["ids"][0])):
        output.append({
            "text":     results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i],
        })
    return output


def find_sources_by_pattern(pattern: str) -> list[str]:
    """Retourne les noms de sources dont le nom contient le pattern (insensible à la casse)."""
    docs = list_documents()
    pat = pattern.lower().replace("-", "").replace("_", "")
    return [
        d["source"] for d in docs
        if pat in d["source"].lower().replace("-", "").replace("_", "")
    ]
