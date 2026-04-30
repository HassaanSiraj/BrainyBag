# RAG Learning

A local Retrieval-Augmented Generation (RAG) system built for learning purposes.
Ask questions over your own documents — fully local, no API costs.

**Stack:** Ollama (Llama3 + nomic-embed-text) · Qdrant · FastAPI · React + Vite

---

## Project Structure

```
rag-learning/
├── backend/
│   ├── app.py                   # FastAPI — all API routes
│   ├── ingest.py                # PDF/TXT/MD → chunks → embeddings → Qdrant
│   ├── query.py                 # Embed query → search → stream Llama3 answer
│   ├── chunker.py               # Fixed-size text splitting with overlap
│   ├── config.py                # All tuneable settings (models, chunk size, top-k)
│   ├── qdrant_client_factory.py # Qdrant singleton client
│   ├── data/                    # Drop your documents here
│   ├── pyproject.toml
│   └── uv.lock
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js               # All fetch calls to the backend
    │   └── components/
    │       ├── ChatPanel.jsx    # Chat UI with streaming answers
    │       ├── DocumentPanel.jsx # Upload / list / delete / reingest docs
    │       └── ChunkDrawer.jsx  # Slide-in panel showing retrieved chunks + scores
    ├── index.html
    └── package.json
```

---

## Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| [Ollama](https://ollama.com) | Local LLM + embeddings | `brew install ollama` |
| [Docker](https://www.docker.com) | Run Qdrant | Docker Desktop |
| [uv](https://docs.astral.sh/uv) | Python package manager | `brew install uv` |
| Node.js 20+ | Frontend | `brew install node` |

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

## Running the Servers

Open **three terminal windows** and run one command in each.

### Terminal 1 — Qdrant

```bash
docker run -d --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/backend/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

> If the container already exists from a previous run, restart it with:
> ```bash
> docker start qdrant
> ```

### Terminal 2 — Backend

```bash
cd backend
uv run python -m uvicorn app:app --reload
```

API available at: http://localhost:8000
Interactive docs at: http://localhost:8000/docs

### Terminal 3 — Frontend

```bash
cd frontend
npm run dev
```

UI available at: http://localhost:5173

---

## Usage

1. Open **http://localhost:5173**
2. **Upload** a PDF, TXT, or MD file using the left panel
3. **Ask questions** in the chat panel on the right
4. Click **"N sources"** on any answer to see which chunks were retrieved and their similarity scores

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/status` | Collection stats |
| `GET` | `/documents` | List ingested documents |
| `POST` | `/documents/upload` | Upload and ingest a file |
| `POST` | `/documents/upload?force=true` | Force re-ingest |
| `DELETE` | `/documents/{filename}` | Delete a document's chunks |
| `POST` | `/documents/{filename}/reingest` | Re-ingest an existing file |
| `POST` | `/query` | Ask a question — returns chunks + answer |
| `POST` | `/query/stream` | Ask a question — streams the answer |

---

## Configuration

All settings are in `backend/config.py`:

```python
OLLAMA_LLM_MODEL   = "llama3"           # swap to llama3.2, mistral, etc.
OLLAMA_EMBED_MODEL = "nomic-embed-text"
CHUNK_SIZE         = 500                # characters per chunk
CHUNK_OVERLAP      = 50                 # overlap between chunks
TOP_K              = 20                  # chunks retrieved per query
```

To register metadata (title, author, genre) for a document so it can be found by meta-questions:

```python
FILE_METADATA = {
    "My Book.pdf": "Title: My Book. Author: Jane Doe. Genre: Non-fiction. Summary: ...",
}
```
