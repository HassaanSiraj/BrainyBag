"""
Ingestion module — all functions are importable by app.py.
"""

from pathlib import Path

import ollama
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

from chunker import chunk_text
from config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    COLLECTION_NAME,
    FILE_METADATA,
    OLLAMA_EMBED_MODEL,
    VECTOR_SIZE,
)
from qdrant_client_factory import get_client


def ensure_collection(client: QdrantClient) -> None:
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def already_ingested(client: QdrantClient, source: str) -> bool:
    results, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=Filter(
            must=[FieldCondition(key="source", match=MatchValue(value=source))]
        ),
        limit=1,
        with_payload=True,
    )
    return len(results) > 0


def delete_file_chunks(client: QdrantClient, source: str) -> None:
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[FieldCondition(key="source", match=MatchValue(value=source))]
        ),
    )


def extract_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return path.read_text(encoding="utf-8", errors="ignore")


def embed(texts: list[str]) -> list[list[float]]:
    return [
        ollama.embeddings(model=OLLAMA_EMBED_MODEL, prompt=t)["embedding"]
        for t in texts
    ]


def upsert_metadata_chunk(client: QdrantClient, source: str) -> bool:
    """Embed and store the metadata chunk. Returns True if metadata exists for this file."""
    meta_text = FILE_METADATA.get(source)
    if not meta_text:
        return False
    vector = embed([meta_text])[0]
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=abs(hash(f"{source}_metadata")) % (10**15),
                vector=vector,
                payload={"text": meta_text, "source": source, "chunk_id": "metadata"},
            )
        ],
    )
    return True


def ingest_file(path: Path, force: bool = False) -> dict:
    """
    Ingest a single file. Returns a summary dict.
    force=True deletes existing chunks and re-ingests from scratch.
    """
    # Consume the streaming generator and return the final event.
    result = {}
    for event in ingest_file_iter(path, force=force):
        result = event
    return result


def ingest_file_iter(path: Path, force: bool = False):
    """
    Generator version of ingest_file.
    Yields progress dicts:  {"done": False, "phase": str, "current": int, "total": int}
    Final yield:            {"done": True,  "status": str, "source": str, "chunks": int, ...}
    """
    client = get_client()
    ensure_collection(client)
    source = path.name

    if already_ingested(client, source):
        if not force:
            yield {"done": True, "source": source, "status": "skipped", "reason": "already ingested", "chunks": 0}
            return
        yield {"done": False, "phase": "Removing previous index…", "current": 0, "total": 0}
        delete_file_chunks(client, source)

    yield {"done": False, "phase": "Reading document…", "current": 0, "total": 0}
    text = extract_text(path)

    yield {"done": False, "phase": "Splitting into chunks…", "current": 0, "total": 0}
    chunks = chunk_text(text, source=source)
    total  = len(chunks)

    vectors = []
    for i, chunk in enumerate(chunks):
        yield {"done": False, "phase": "Embedding", "current": i + 1, "total": total}
        vec = ollama.embeddings(model=OLLAMA_EMBED_MODEL, prompt=chunk["text"])["embedding"]
        vectors.append(vec)

    points = [
        PointStruct(
            id=abs(hash(f"{source}_{c['chunk_id']}")) % (10**15),
            vector=vectors[i],
            payload={"text": c["text"], "source": c["source"], "chunk_id": c["chunk_id"]},
        )
        for i, c in enumerate(chunks)
    ]

    # Upsert in batches to stay within Qdrant's 32 MB payload limit.
    batch_size = 100
    num_batches = max(1, (len(points) + batch_size - 1) // batch_size)
    for b in range(num_batches):
        batch = points[b * batch_size : (b + 1) * batch_size]
        yield {
            "done": False,
            "phase": "Storing in vector database…",
            "current": min((b + 1) * batch_size, len(points)),
            "total": len(points),
        }
        client.upsert(collection_name=COLLECTION_NAME, points=batch)

    upsert_metadata_chunk(client, source)

    yield {
        "done":          True,
        "source":        source,
        "status":        "ingested",
        "chunks":        len(points),
        "chunk_size":    CHUNK_SIZE,
        "chunk_overlap": CHUNK_OVERLAP,
        "has_metadata":  source in FILE_METADATA,
    }


def delete_document(source: str) -> dict:
    client = get_client()
    if not already_ingested(client, source):
        return {"source": source, "status": "not_found"}
    delete_file_chunks(client, source)
    return {"source": source, "status": "deleted"}


def list_documents() -> list[dict]:
    client = get_client()
    ensure_collection(client)
    all_points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        with_payload=True,
        limit=10_000,
    )
    counts: dict[str, int] = {}
    for p in all_points:
        src = p.payload.get("source", "unknown")
        counts[src] = counts.get(src, 0) + 1
    return [{"source": src, "chunks": count} for src, count in sorted(counts.items())]


def collection_status() -> dict:
    client = get_client()
    ensure_collection(client)
    info = client.get_collection(COLLECTION_NAME)
    return {
        "collection":   COLLECTION_NAME,
        "points_count": info.points_count,
        "vector_size":  VECTOR_SIZE,
        "embed_model":  OLLAMA_EMBED_MODEL,
    }
