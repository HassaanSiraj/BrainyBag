"""
RAG Learning API
Run with: uv run uvicorn app:app --reload
Docs at:  http://localhost:8000/docs
"""

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

import ingest as ing
import query as qry

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="RAG Learning API",
    description="Local RAG system powered by Ollama + Qdrant",
    version="1.0.0",
)

import os
_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    question:  str
    chunks:    list[dict]
    answer:    str


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

@app.get("/status", summary="Collection stats")
def status():
    return ing.collection_status()


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

@app.get("/documents", summary="List all ingested documents")
def list_documents():
    return ing.list_documents()


@app.post("/documents/upload", summary="Upload and ingest a file — streams SSE progress")
async def upload_document(file: UploadFile, force: bool = False):
    """
    Upload a document and stream ingestion progress as Server-Sent Events.
    Each event is a JSON object:
      {"done": false, "phase": "Embedding", "current": 42, "total": 300}
    The final event has done=true and includes the ingestion summary.
    """
    allowed = {".pdf", ".txt", ".md"}
    suffix  = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{suffix}'. Allowed: {allowed}")

    dest = DATA_DIR / file.filename
    dest.write_bytes(await file.read())

    def event_stream():
        for progress in ing.ingest_file_iter(dest, force=force):
            yield f"data: {json.dumps(progress)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.delete("/documents/{filename}", summary="Delete all chunks for a document")
def delete_document(filename: str):
    result = ing.delete_document(filename)
    if result["status"] == "not_found":
        raise HTTPException(status_code=404, detail=f"'{filename}' not found in collection")
    return result


@app.get("/documents/{filename}/file", summary="Serve the raw uploaded file")
def serve_document_file(filename: str):
    path = DATA_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"'{filename}' not found in data/ folder")
    return FileResponse(
        path,
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""},
    )


@app.post("/documents/{filename}/reingest", summary="Delete and re-ingest an already-uploaded file")
def reingest_document(filename: str):
    """Re-ingests a file that was previously uploaded. The file must still exist in data/."""
    path = DATA_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"'{filename}' not found in data/ folder")
    return ing.ingest_file(path, force=True)


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------

@app.post("/query", summary="Ask a question — returns chunks + full answer")
def query(req: QueryRequest):
    """
    Retrieve relevant chunks and return both the chunks and the generated answer.
    Useful for understanding what context the LLM used.
    """
    chunks = qry.retrieve(req.question)
    answer_tokens = list(qry.stream_answer(req.question))
    return QueryResponse(
        question=req.question,
        chunks=chunks,
        answer="".join(answer_tokens),
    )


@app.post("/query/stream", summary="Ask a question — streams the answer token by token")
def query_stream(req: QueryRequest):
    """
    Stream the LLM answer token by token using Server-Sent Events.
    Use this for chat-style UIs where you want text to appear progressively.
    """
    return StreamingResponse(
        qry.stream_answer(req.question),
        media_type="text/plain",
    )
