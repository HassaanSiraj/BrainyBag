import styles from "./IconNav.module.css";

const NAV = [
  { id: "library",  label: "Library",  icon: "📚" },
  { id: "chats",    label: "Chats",    icon: "💬" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function IconNav({ activeView, onNavigate }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <span className={styles.logoLetter}>A</span>
        <span className={styles.logoName}>Athena</span>
      </div>

      <ul className={styles.items}>
        {NAV.map(({ id, label, icon }) => (
          <li key={id}>
            <button
              className={`${styles.item} ${activeView === id ? styles.active : ""}`}
              onClick={() => onNavigate(id)}
            >
              <span className={styles.icon}>{icon}</span>
              <span className={styles.label}>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
