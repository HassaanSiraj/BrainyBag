"""
Query module — all functions are importable by app.py.
"""

from collections.abc import Iterator

import ollama
from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue

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


def _source_filter(source: str | None) -> Filter | None:
    if not source:
        return None
    return Filter(must=[FieldCondition(key="source", match=MatchValue(value=source))])


def search(client: QdrantClient, vector: list[float], source: str | None = None) -> list:
    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=vector,
        limit=TOP_K,
        with_payload=True,
        query_filter=_source_filter(source),
    )
    return result.points


def build_messages(question: str, hits: list, source: str | None = None) -> list[dict]:
    context_blocks = [
        f"[{i}] (source: {h.payload['source']}, score: {h.score:.3f})\n{h.payload['text']}"
        for i, h in enumerate(hits, 1)
    ]
    context = "\n\n".join(context_blocks)
    scope   = f' from "{source}"' if source else ""
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"Context{scope}:\n{context}\n\nQuestion: {question}"},
    ]


def retrieve(question: str, source: str | None = None) -> list[dict]:
    """Return the top-K retrieved chunks with scores (used by the API for transparency)."""
    client = get_client()
    vector = embed_query(question)
    hits   = search(client, vector, source=source)
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


def stream_answer(question: str, source: str | None = None) -> Iterator[str]:
    """Yield answer tokens one by one for StreamingResponse."""
    client   = get_client()
    vector   = embed_query(question)
    hits     = search(client, vector, source=source)
    messages = build_messages(question, hits, source=source)

    for chunk in ollama.chat(model=OLLAMA_LLM_MODEL, messages=messages, stream=True):
        yield chunk["message"]["content"]
