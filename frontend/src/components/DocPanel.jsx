import { useEffect, useRef, useState } from "react";
import { deleteDocument, getDocumentFileUrl, listDocuments, reingestDocument, uploadDocument } from "../api";
import styles from "./DocPanel.module.css";

const FILE_COLORS = ["#e8c4a0", "#a8c4e8", "#c4e8a8", "#e8a8c4", "#c4a8e8", "#e8e0a8"];

function DocCard({ doc, onAskQuestions, onDelete, onReingest, colorIdx }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ext   = doc.source.split(".").pop().toUpperCase();
  const name  = doc.source.replace(/\.[^.]+$/, "");
  const color = FILE_COLORS[colorIdx % FILE_COLORS.length];
  const fileUrl = getDocumentFileUrl(doc.source);

  return (
    <div className={styles.card}>
      {/* Clickable book cover — opens file in new tab */}
      <a
        className={styles.thumb}
        style={{ background: color }}
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open book"
      >
        <span className={styles.thumbExt}>{ext}</span>
      </a>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.cardTop}>
          <p className={styles.docTitle}>{name}</p>

          {/* ⋯ menu */}
          <div className={styles.menuWrap}>
            <button className={styles.menuBtn} onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>⋯</button>
            {menuOpen && (
              <div className={styles.menu}>
                <button onClick={() => { onReingest(doc.source); setMenuOpen(false); }}>↺ Re-index</button>
                <button className={styles.menuDanger} onClick={() => { onDelete(doc.source); setMenuOpen(false); }}>✕ Remove</button>
              </div>
            )}
          </div>
        </div>

        <p className={styles.docMeta}>{doc.chunks} chunks · <span className={styles.indexed}>Indexed</span></p>

        <button className={styles.btnAsk} onClick={() => onAskQuestions(doc.source)}>
          💬 Ask Questions
        </button>
      </div>
    </div>
  );
}

export default function DocPanel({ onSelectDoc, onStatusChange }) {
  const [docs, setDocs]           = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(null); // { phase, current, total }
  const [toast, setToast]         = useState(null);
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
      setProgress({ phase: "Preparing…", current: 0, total: 0 });
      try {
        const r = await uploadDocument(file, false, (evt) => {
          if (!evt.done) setProgress({ phase: evt.phase, current: evt.current, total: evt.total });
        });
        setProgress(null);
        showToast(
          r.status === "skipped" ? `"${file.name}" already indexed` : `"${file.name}" — ${r.chunks} chunks indexed`,
          r.status === "skipped" ? "warn" : "ok"
        );
        refresh(true);
      } catch (e) {
        setProgress(null);
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
      onSelectDoc(null);
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
            onAskQuestions={(f) => onSelectDoc(f)}
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

        {uploading && progress ? (
          <div className={styles.progressBox}>
            <div className={styles.progressHeader}>
              <span className={styles.progressPhase}>{progress.phase}</span>
              {progress.total > 0 && (
                <span className={styles.progressCount}>
                  {progress.current} / {progress.total}
                </span>
              )}
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  width: progress.total > 0
                    ? `${Math.round((progress.current / progress.total) * 100)}%`
                    : "100%",
                  animation: progress.total === 0 ? "indeterminate 1.4s ease infinite" : "none",
                }}
              />
            </div>
            {progress.total > 0 && (
              <p className={styles.progressPct}>
                {Math.round((progress.current / progress.total) * 100)}% complete
              </p>
            )}
          </div>
        ) : (
          <button
            className={styles.importBtn}
            onClick={() => fileRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles([...e.dataTransfer.files]); }}
          >
            + Import New Document
          </button>
        )}
      </div>

      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>{toast.msg}</div>
      )}
    </aside>
  );
}
