import { useEffect, useRef, useState } from "react";
import { streamQuery } from "../api";
import ChunkDrawer from "./ChunkDrawer";
import styles from "./ChatArea.module.css";

const SUGGESTIONS = [
  "Summarize the key insights from this document",
  "What are the main themes explored?",
  "Who is the author and what is this book about?",
];

function Message({ msg }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (msg.role === "user") {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{msg.content}</div>
      </div>
    );
  }

  return (
    <div className={styles.aiRow}>
      <div className={styles.aiBadge}>A</div>
      <div className={styles.aiContent}>
        <pre className={styles.aiText}>
          {msg.content}
          {msg.streaming && <span className={styles.cursor} />}
        </pre>
        {!msg.streaming && msg.chunks?.length > 0 && (
          <button className={styles.sourcesBtn} onClick={() => setDrawerOpen(true)}>
            <span className={styles.dot} />
            {msg.chunks.length} sources
          </button>
        )}
      </div>
      {drawerOpen && <ChunkDrawer chunks={msg.chunks} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}

export default function ChatArea({ selectedDoc, status }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const bottomRef   = useRef();
  const textareaRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }); // no dep array — runs every render, ensures correct height on mount too

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);

    const userId = Date.now();
    const aiId   = userId + 1;
    setMessages((p) => [
      ...p,
      { role: "user",      content: q,  id: userId },
      { role: "assistant", content: "", streaming: true, chunks: [], id: aiId },
    ]);

    try {
      await streamQuery(
        q,
        (t) => setMessages((p) => p.map((m) => m.id === aiId ? { ...m, content: m.content + t } : m)),
        (c) => setMessages((p) => p.map((m) => m.id === aiId ? { ...m, chunks: c } : m)),
      );
    } catch (e) {
      setMessages((p) => p.map((m) => m.id === aiId ? { ...m, content: `Error: ${e.message}` } : m));
    } finally {
      setMessages((p) => p.map((m) => m.id === aiId ? { ...m, streaming: false } : m));
      setBusy(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <main className={styles.area}>
      {isEmpty ? (
        <div className={styles.empty}>
          {/* Watermark */}
          <div className={styles.watermark}>A</div>

          <div className={styles.emptyContent}>
            <p className={styles.welcome}>
              Welcome to Athena, your personal AI knowledge assistant.
              {selectedDoc && <> Exploring <em>{selectedDoc.replace(/\.[^.]+$/, "")}</em>.</>}
              {!selectedDoc && " How can I help you explore your library today?"}
            </p>
            <h1 className={styles.mainTitle}>AI Knowledge{"\n"}Assistant</h1>

            <div className={styles.pills}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.pill}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.messages}>
          {messages.map((m) => <Message key={m.id} msg={m} />)}
          <div ref={bottomRef} />
        </div>
      )}

      <div className={styles.inputBar}>
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.input}
            placeholder="Ask Athena anything about your books…"
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className={styles.sendBtn} onClick={send} disabled={busy || !input.trim()}>
            {busy ? <span className={styles.spinner} /> : "▶"}
          </button>
        </div>
        {status && (
          <p className={styles.statusHint}>{status.points_count} chunks indexed · {status.embed_model}</p>
        )}
      </div>
    </main>
  );
}
