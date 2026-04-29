import { useEffect, useState } from "react";
import { getStatus } from "./api";
import ChatPanel from "./components/ChatPanel";
import DocumentPanel from "./components/DocumentPanel";
import styles from "./App.module.css";

export default function App() {
  const [status, setStatus] = useState(null);
  const [theme, setTheme]   = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const fetchStatus = async () => {
    try {
      const s = await getStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className={styles.layout}>
      <DocumentPanel onStatusChange={fetchStatus} />
      <ChatPanel status={status} />
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );
}
