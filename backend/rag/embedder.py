from sentence_transformers import SentenceTransformer

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

_model = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print(f"[RAG] Chargement du modèle d'embedding : {MODEL_NAME} ...")
        _model = SentenceTransformer(MODEL_NAME)
        print("[RAG] Modèle prêt")
    return _model


def embed(text: str) -> list[float]:
    return _get_model().encode(text, convert_to_numpy=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    return _get_model().encode(texts, convert_to_numpy=True).tolist()
