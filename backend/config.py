# All tuneable constants — change these to experiment

OLLAMA_EMBED_MODEL = "nomic-embed-text"
OLLAMA_LLM_MODEL   = "llama3"

import os
QDRANT_URL        = os.environ.get("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME   = "rag_docs"
VECTOR_SIZE       = 768          # nomic-embed-text output dimension

CHUNK_SIZE        = 500          # characters per chunk — try 300–800
CHUNK_OVERLAP     = 50           # characters of overlap between chunks
TOP_K             = 20            # how many chunks to retrieve per query

# Per-file metadata injected as an explicit chunk at ingestion time.
# Key   = filename (must match what's in data/)
# Value = free-form description — the more detail, the better retrieval for meta-questions
FILE_METADATA: dict[str, str] = {
    "Deep Work.pdf": (
        "Title: Deep Work. "
        "Author: Cal Newport. "
        "Genre: Self-help, non-fiction, productivity. "
        "Summary: Deep Work argues that the ability to focus without distraction on cognitively "
        "demanding tasks is becoming increasingly rare and valuable. Newport makes the case for "
        "cultivating deep work habits and provides practical rules for doing so in a distracted world."
    ),
}
