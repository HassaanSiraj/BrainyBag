import { useEffect, useState } from "react";
import { getStatus } from "./api";
import IconNav from "./components/IconNav";
import DocPanel from "./components/DocPanel";
import ChatArea from "./components/ChatArea";
import styles from "./App.module.css";

export default function App() {
  const [status, setStatus]   = useState(null);
  const [activeView, setView] = useState("library");
  const [selectedDoc, setDoc] = useState(null);

  const fetchStatus = async () => {
    try { setStatus(await getStatus()); }
    catch { setStatus(null); }
  };

  useEffect(() => { fetchStatus(); }, []);

  return (
    <div className={styles.layout}>
      <IconNav activeView={activeView} onNavigate={setView} />
      <DocPanel
        selectedDoc={selectedDoc}
        onSelectDoc={setDoc}
        onStatusChange={fetchStatus}
      />
      <ChatArea selectedDoc={selectedDoc} status={status} />
    </div>
  );
}
