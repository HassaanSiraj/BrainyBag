# BrainyBag

**BrainyBag** is a fully local Retrieval-Augmented Generation (RAG) system — upload your own books and documents, then ask questions about them. No cloud APIs, no data leaving your machine.

---

## Demo

<video src="assets/demo.mp4" controls width="100%"></video>

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **LLM** | [Ollama](https://ollama.com) · `llama3` | Generates answers from retrieved context |
| **Embeddings** | Ollama · `nomic-embed-text` | Converts text → 768-dim vectors |
| **Vector DB** | [Qdrant](https://qdrant.tech) (Docker) | Stores & searches embeddings by cosine similarity |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com) + Python | REST API, ingestion pipeline, query engine |
| **Frontend** | React + Vite | Chat UI, document management panel |
| **Streaming** | Server-Sent Events (SSE) | Real-time ingestion progress streamed chunk-by-chunk |
| **Package manager** | [uv](https://docs.astral.sh/uv) | Fast Python dependency management |

---

## How It Works

```
PDF / TXT / MD
      │
      ▼
 extract_text()          pypdf / plain read
      │
      ▼
  chunk_text()           fixed-size chunks (500 chars, 50 overlap)
      │
      ▼
 nomic-embed-text        768-dim vector per chunk  ← Ollama
      │
      ▼
   Qdrant upsert         stored with {text, source, chunk_id} payload
      │
      ▼ (at query time)
 embed question          nomic-embed-text
      │
      ▼
 Qdrant query_points     top-K nearest chunks (cosine similarity)
      │
      ▼
  llama3 chat            answer streamed back token-by-token ← Ollama
```

### Server-Sent Events (SSE)

The upload endpoint (`POST /documents/upload`) streams progress as SSE events so the UI can display a live progress bar:

```
data: {"done": false, "phase": "Reading document…",  "current": 0,   "total": 0}
data: {"done": false, "phase": "Embedding",           "current": 42,  "total": 300}
data: {"done": false, "phase": "Storing in vector database…", "current": 300, "total": 300}
data: {"done": true,  "status": "ingested", "chunks": 300, "source": "mybook.pdf"}
```

The frontend reads these with the Fetch Streaming API (`response.body.getReader()`) — no `EventSource` needed since the request is a POST.


## Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| [Ollama](https://ollama.com) | Local LLM + embeddings | `brew install ollama` |
| [Docker](https://www.docker.com) | Run Qdrant | Docker Desktop |
| [uv](https://docs.astral.sh/uv) | Python package manager | `brew install uv` |
| Node.js 20+ | Frontend build | `brew install node` |

---

## Setup

### 1. Pull Ollama models

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

### 2. Install dependencies

```bash
# Backend
cd backend && uv sync

# Frontend
cd frontend && npm install
```

---

## Running the App

Open **three terminal windows**, one per service.

### Terminal 1 — Qdrant (vector database)

```bash
docker run -d --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/backend/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

> Already created the container before? Just restart it:
> ```bash
> docker start qdrant
> ```

Qdrant dashboard: http://localhost:6333/dashboard

### Terminal 2 — Backend (FastAPI)

```bash
cd backend
uv run python -m uvicorn app:app --reload
```

- API: http://localhost:8000
- Interactive docs (Swagger): http://localhost:8000/docs

### Terminal 3 — Frontend (Vite)

```bash
cd frontend
npm run dev
```

UI: http://localhost:5173

---

## Usage

1. Open **http://localhost:5173**
2. Click **+ Import New Document** — upload a PDF, TXT, or MD file
3. Watch the **live progress bar** as each chunk is embedded (SSE stream)
4. Click the **book thumbnail** to open the document in a new tab
5. Click **💬 Ask Questions** to scope the chat to that specific book
6. Type your question — the answer is generated from relevant chunks only
7. Click **N sources** on any answer to inspect the exact chunks and similarity scores
8. Click **✕ All books** in the scope banner to search across your entire library

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/status` | Collection stats (chunk count, model info) |
| `GET` | `/documents` | List all ingested documents with chunk counts |
| `POST` | `/documents/upload` | Upload + ingest — **streams SSE progress** |
| `POST` | `/documents/upload?force=true` | Force re-ingest an existing document |
| `GET` | `/documents/{filename}/file` | Serve raw file inline (PDF viewer) |
| `DELETE` | `/documents/{filename}` | Delete all chunks for a document |
| `POST` | `/documents/{filename}/reingest` | Re-ingest an already-uploaded file |
| `POST` | `/query` | Ask a question — returns chunks + full answer |
| `POST` | `/query/stream` | Ask a question — streams the answer token-by-token |

### Query with document filter

Pass `source` to restrict the search to a single document:

```json
POST /query
{
  "question": "What is the main theme?",
  "source": "harrypotter.pdf"
}
```

---

## Configuration

All settings live in `backend/config.py`:

```python
OLLAMA_LLM_MODEL   = "llama3"            # swap to llama3.2, mistral, gemma3, etc.
OLLAMA_EMBED_MODEL = "nomic-embed-text"  # 768-dim embeddings
QDRANT_URL         = "http://localhost:6333"
COLLECTION_NAME    = "rag_docs"
VECTOR_SIZE        = 768

CHUNK_SIZE         = 500    # characters per chunk — tune between 300–800
CHUNK_OVERLAP      = 50     # overlap between adjacent chunks
TOP_K              = 20     # chunks retrieved per query
```

### Registering document metadata

Inject explicit metadata (title, author, genre) so meta-questions ("Who wrote this?") return accurate answers:

```python
FILE_METADATA = {
    "my-book.pdf": (
        "Title: My Book. "
        "Author: Jane Doe. "
        "Genre: Non-fiction. "
        "Summary: A brief description of the book..."
    ),
}
```

This creates a dedicated metadata chunk in Qdrant that gets retrieved when users ask about the document itself rather than its content.

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| **Fully local** | No API keys, no data sent externally, works offline |
| **SSE for ingestion progress** | Large PDFs take minutes to embed; a progress bar is essential UX |
| **Per-document query filter** | Qdrant `query_filter` restricts cosine search to one source, so answers don't bleed across books |
| **Batch upsert (100 points)** | Qdrant rejects payloads > 32 MB; batching keeps each request ~3 MB |
| **nomic-embed-text** | Open-weights, 768-dim, strong retrieval quality, runs well on CPU via Ollama |
| **Inline SVG logo** | Avoids browser rendering issues with `<img>` + SVG filters; fully themeable via CSS |
