"""
Carga del modelo de embeddings y utilidades de similitud.

Modelo: paraphrase-multilingual-MiniLM-L12-v2 (multilingüe, español + inglés).
Se carga una sola vez (singleton) y se reutiliza en scoring y clustering.
"""

import numpy as np

_MODEL = None
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def get_model():
    global _MODEL
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer(MODEL_NAME)
    return _MODEL


def embed(textos):
    """Devuelve np.array (n, dim) de embeddings normalizados."""
    model = get_model()
    if isinstance(textos, str):
        textos = [textos]
    return model.encode(textos, normalize_embeddings=True,
                        show_progress_bar=False, convert_to_numpy=True)


def coseno(a, b):
    """Similitud coseno entre dos vectores (asume normalizados o no)."""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))
