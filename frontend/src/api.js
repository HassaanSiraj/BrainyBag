const BASE = "http://localhost:8000";

export const getDocumentFileUrl = (filename) =>
  `${BASE}/documents/${encodeURIComponent(filename)}/file`;

export async function getStatus() {
  const r = await fetch(`${BASE}/status`);
  return r.json();
}

export async function listDocuments() {
  const r = await fetch(`${BASE}/documents`);
  return r.json();
}

/**
 * Upload a file and stream ingestion progress via SSE.
 * onProgress({ done, phase, current, total }) is called for every event.
 * Resolves with the final summary object when done=true.
 */
export async function uploadDocument(file, force = false, onProgress = null) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${BASE}/documents/upload?force=${force}`, {
    method: "POST",
    body: form,
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Upload failed");
  }

  const reader  = r.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";
  let   result  = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete last line
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));
      onProgress?.(event);
      if (event.done) result = event;
    }
  }
  return result;
}

export async function deleteDocument(filename) {
  const r = await fetch(`${BASE}/documents/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Delete failed");
  }
  return r.json();
}

export async function reingestDocument(filename) {
  const r = await fetch(`${BASE}/documents/${encodeURIComponent(filename)}/reingest`, {
    method: "POST",
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.detail || "Reingest failed");
  }
  return r.json();
}

/**
 * Stream an answer token by token.
 * onToken(str) is called for each chunk.
 * onChunks(arr) is called once with the retrieved context chunks.
 */
export async function streamQuery(question, onToken, onChunks) {
  // First fetch the chunks separately so we can show them
  const metaRes = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!metaRes.ok) throw new Error("Query failed");
  const data = await metaRes.json();
  onChunks(data.chunks);

  // Stream the answer character by character for effect
  const words = data.answer.split("");
  for (const char of words) {
    onToken(char);
    await new Promise((r) => setTimeout(r, 8));
  }
}
