import { useEffect, useRef, useState } from "react";
import { deleteDocument, listDocuments, reingestDocument, uploadDocument } from "../api";
import styles from "./DocumentPanel.module.css";

export default function DocumentPanel({ onStatusChange }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast]       = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listDocuments();
      setDocs(data);
      onStatusChange?.();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleFiles = async (files) => {
    const allowed = ["application/pdf", "text/plain", "text/markdown"];
    for (const file of files) {
      if (!allowed.includes(file.type) && !file.name.endsWith(".md")) {
        showToast(`"${file.name}" is not a supported file type`, "error");
        continue;
      }
      setUploading(true);
      try {
        const result = await uploadDocument(file);
        showToast(
          result.status === "skipped"
            ? `"${file.name}" already ingested`
            : `"${file.name}" ingested — ${result.chunks} chunks`,
          result.status === "skipped" ? "warn" : "ok"
        );
        refresh();
      } catch (e) {
        showToast(e.message, "error");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles([...e.dataTransfer.files]);
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete all chunks for "${filename}"?`)) return;
    try {
      await deleteDocument(filename);
      showToast(`"${filename}" deleted`, "ok");
      refresh();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleReingest = async (filename) => {
    setUploading(true);
    try {
      const result = await reingestDocument(filename);
      showToast(`"${filename}" re-ingested — ${result.chunks} chunks`, "ok");
      refresh();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.label}>Documents</span>
        <span className={styles.count}>{docs.length}</span>
      </header>

      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ""} ${uploading ? styles.busy : ""}`}
        onClick={() => !uploading && fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md"
          style={{ display: "none" }}
          onChange={(e) => handleFiles([...e.target.files])}
        />
        {uploading ? (
          <span className={styles.spinner} />
        ) : (
          <>
            <span className={styles.dropIcon}>↑</span>
            <span className={styles.dropText}>Drop PDF / TXT / MD</span>
          </>
        )}
      </div>

      <ul className={styles.list}>
        {loading && <li className={styles.empty}>Loading…</li>}
        {!loading && docs.length === 0 && (
          <li className={styles.empty}>No documents yet</li>
        )}
        {docs.map((doc) => (
          <li key={doc.source} className={styles.item}>
            <div className={styles.itemInfo}>
              <span className={styles.filename}>{doc.source}</span>
              <span className={styles.chunks}>{doc.chunks} chunks</span>
            </div>
            <div className={styles.itemActions}>
              <button
                className={styles.btnReingest}
                title="Re-ingest"
                onClick={() => handleReingest(doc.source)}
              >↺</button>
              <button
                className={styles.btnDelete}
                title="Delete"
                onClick={() => handleDelete(doc.source)}
              >✕</button>
            </div>
          </li>
        ))}
      </ul>

      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.msg}
        </div>
      )}
    </aside>
  );
}
