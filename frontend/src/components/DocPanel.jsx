import { useEffect, useRef, useState } from "react";
import { deleteDocument, listDocuments, reingestDocument, uploadDocument } from "../api";
import styles from "./DocPanel.module.css";

const FILE_COLORS = ["#e8c4a0", "#a8c4e8", "#c4e8a8", "#e8a8c4", "#c4a8e8", "#e8e0a8"];

function DocCard({ doc, isSelected, onSelect, onDelete, onReingest, colorIdx }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ext = doc.source.split(".").pop().toUpperCase();
  const name = doc.source.replace(/\.[^.]+$/, "");
  const color = FILE_COLORS[colorIdx % FILE_COLORS.length];

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
      onClick={() => onSelect(doc.source)}
    >
      {/* Thumbnail */}
      <div className={styles.thumb} style={{ background: color }}>
        <span className={styles.thumbExt}>{ext}</span>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <p className={styles.docTitle}>{name}</p>
        <p className={styles.docMeta}>{doc.chunks} chunks</p>
        <div className={styles.progressRow}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "100%" }} />
          </div>
          <span className={styles.progressLabel}>Indexed</span>
        </div>
        <div className={styles.statusRow}>
          <span className={styles.statusBadge}>
            <span className={styles.statusDot} />
            AI Indexing Status: Indexed
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
        <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>⋯</button>
        {menuOpen && (
          <div className={styles.menu}>
            <button onClick={() => { onReingest(doc.source); setMenuOpen(false); }}>↺ Re-index</button>
            <button className={styles.menuDanger} onClick={() => { onDelete(doc.source); setMenuOpen(false); }}>✕ Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocPanel({ selectedDoc, onSelectDoc, onStatusChange }) {
  const [docs, setDocs]         = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]       = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = async (notifyParent = false) => {
    try {
      setDocs(await listDocuments());
      if (notifyParent) onStatusChange?.();
    }
    catch { /* backend not ready */ }
  };

  useEffect(() => { refresh(); }, []);

  const handleFiles = async (files) => {
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "txt", "md"].includes(ext)) {
        showToast(`"${file.name}" — unsupported type`, "error");
        continue;
      }
      setUploading(true);
      try {
        const r = await uploadDocument(file);
        showToast(
          r.status === "skipped" ? `"${file.name}" already indexed` : `"${file.name}" — ${r.chunks} chunks`,
          r.status === "skipped" ? "warn" : "ok"
        );
        refresh(true);
      } catch (e) {
        showToast(e.message, "error");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Remove "${filename}"?`)) return;
    try {
      await deleteDocument(filename);
      if (selectedDoc === filename) onSelectDoc(null);
      showToast(`"${filename}" removed`, "ok");
      refresh(true);
    } catch (e) { showToast(e.message, "error"); }
  };

  const handleReingest = async (filename) => {
    setUploading(true);
    try {
      const r = await reingestDocument(filename);
      showToast(`"${filename}" re-indexed — ${r.chunks} chunks`, "ok");
      refresh(true);
    } catch (e) { showToast(e.message, "error"); }
    finally { setUploading(false); }
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Document Management</h2>
      </div>

      <div className={styles.list}>
        {docs.length === 0 && !uploading && (
          <p className={styles.emptyHint}>No documents yet. Import one below.</p>
        )}
        {docs.map((doc, i) => (
          <DocCard
            key={doc.source}
            doc={doc}
            colorIdx={i}
            isSelected={selectedDoc === doc.source}
            onSelect={onSelectDoc}
            onDelete={handleDelete}
            onReingest={handleReingest}
          />
        ))}
      </div>

      <div className={styles.footer}>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md"
          style={{ display: "none" }}
          onChange={(e) => handleFiles([...e.target.files])}
        />
        <button
          className={styles.importBtn}
          onClick={() => !uploading && fileRef.current.click()}
          disabled={uploading}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles([...e.dataTransfer.files]); }}
        >
          {uploading
            ? <><span className={styles.spinner} /> Indexing…</>
            : <>+ Import New Document</>
          }
        </button>
      </div>

      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>{toast.msg}</div>
      )}
    </aside>
  );
}
