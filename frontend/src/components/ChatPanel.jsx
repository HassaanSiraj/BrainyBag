import { useEffect, useRef, useState } from "react";
import { streamQuery } from "../api";
import ChunkDrawer from "./ChunkDrawer";
import styles from "./ChatPanel.module.css";

function Message({ msg }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (msg.role === "user") {
    return (
      <div className={styles.userMsg}>
        <span>{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={styles.assistantMsg}>
      <div className={styles.assistantBubble}>
        <pre className={styles.answerText}>{msg.content}{msg.streaming && <span className={styles.cursor} />}</pre>
        {!msg.streaming && msg.chunks?.length > 0 && (
          <button
            className={styles.chunksBtn}
            onClick={() => setDrawerOpen(true)}
          >
            {msg.chunks.length} sources
          </button>
        )}
      </div>
      {drawerOpen && (
        <ChunkDrawer chunks={msg.chunks} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}

export default function ChatPanel({ status }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [busy, setBusy]         = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;

    setInput("");
    setBusy(true);

    const userMsg = { role: "user", content: q, id: Date.now() };
    const asstMsg = { role: "assistant", content: "", streaming: true, chunks: [], id: Date.now() + 1 };

    setMessages((prev) => [...prev, userMsg, asstMsg]);

    try {
      await streamQuery(
        q,
        (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsg.id ? { ...m, content: m.content + token } : m
            )
          );
        },
        (chunks) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsg.id ? { ...m, chunks } : m
            )
          );
        }
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsg.id
            ? { ...m, content: `Error: ${e.message}`, streaming: false }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstMsg.id ? { ...m, streaming: false } : m
        )
      );
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.title}>Knowledge Assistant</span>
        {status && (
          <span className={styles.statusBadge}>
            {status.points_count} chunks · {status.embed_model}
          </span>
        )}
      </header>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyTitle}>Ask anything about your documents.</span>
            <span className={styles.emptyHint}>Upload files in the sidebar to get started.</span>
          </div>
        )}
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className={styles.inputRow}
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Ask a question…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className={styles.sendBtn} type="submit" disabled={busy || !input.trim()}>
          {busy ? <span className={styles.spinner} /> : "↑"}
        </button>
      </form>
    </div>
  );
}
