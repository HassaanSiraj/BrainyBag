import styles from "./ChunkDrawer.module.css";

export default function ChunkDrawer({ chunks, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <p className={styles.label}>Retrieved Sources</p>
            <p className={styles.sub}>{chunks.length} chunks used as context</p>
          </div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </header>
        <ul className={styles.list}>
          {chunks.map((c) => (
            <li key={c.rank} className={styles.chunk}>
              <div className={styles.meta}>
                <span className={styles.rank}>#{c.rank}</span>
                <span className={styles.source}>{c.source}</span>
                <span className={styles.score}>{(c.score * 100).toFixed(1)}% match</span>
              </div>
              <p className={styles.text}>{c.text}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
