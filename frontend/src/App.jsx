import { useEffect, useState } from "react";
import { getStatus } from "./api";
import DocPanel from "./components/DocPanel";
import ChatArea from "./components/ChatArea";
import styles from "./App.module.css";

export default function App() {
  const [status, setStatus] = useState(null);
  const [selectedDoc, setDoc] = useState(null);

  const fetchStatus = async () => {
    try { setStatus(await getStatus()); }
    catch { setStatus(null); }
  };

  useEffect(() => { fetchStatus(); }, []);

  return (
    <div className={styles.layout}>
      <DocPanel onSelectDoc={setDoc} onStatusChange={fetchStatus} />
      <ChatArea selectedDoc={selectedDoc} onClearDoc={() => setDoc(null)} status={status} />
    </div>
  );
}
