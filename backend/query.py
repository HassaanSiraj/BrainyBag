"""
Query module — all functions are importable by app.py.
"""

from collections.abc import Iterator

import ollama
from qdrant_client import QdrantClient

from config import COLLECTION_NAME, OLLAMA_EMBED_MODEL, OLLAMA_LLM_MODEL, TOP_K
from qdrant_client_factory import get_client

SYSTEM_PROMPT = """\
You are a helpful assistant. Answer the user's question using ONLY the context
provided below. If the answer is not in the context, say "I don't have enough
information in the provided documents to answer that."

Do not make up facts. Be concise and accurate.
"""


def embed_query(question: str) -> list[float]:
    return ollama.embeddings(model=OLLAMA_EMBED_MODEL, prompt=question)["embedding"]


def search(client: QdrantClient, vector: list[float]) -> list:
    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=TOP_K,
        with_payload=True,
    )
    return result.points


def build_messages(question: str, hits: list) -> list[dict]:
    context_blocks = [
        f"[{i}] (source: {h.payload['source']}, score: {h.score:.3f})\n{h.payload['text']}"
        for i, h in enumerate(hits, 1)
    ]
    context = "\n\n".join(context_blocks)
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]


def retrieve(question: str) -> list[dict]:
    """Return the top-K retrieved chunks with scores (used by the API for transparency)."""
    client  = get_client()
    vector  = embed_query(question)
    hits    = search(client, vector)
    return [
        {
            "rank":     i + 1,
            "score":    round(h.score, 4),
            "source":   h.payload["source"],
            "chunk_id": h.payload["chunk_id"],
            "text":     h.payload["text"],
        }
        for i, h in enumerate(hits)
    ]


def stream_answer(question: str) -> Iterator[str]:
    """Yield answer tokens one by one for StreamingResponse."""
    client   = get_client()
    vector   = embed_query(question)
    hits     = search(client, vector)
    messages = build_messages(question, hits)

    for chunk in ollama.chat(model=OLLAMA_LLM_MODEL, messages=messages, stream=True):
        yield chunk["message"]["content"]
