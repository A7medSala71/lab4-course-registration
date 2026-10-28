import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const DataContext = createContext(null);
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toasts, setToasts] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [c, s, r] = await Promise.all([
        api("/api/courses"),
        api("/api/students"),
        api("/api/registrations"),
      ]);
      setCourses(c);
      setStudents(s);
      setRegs(r);
      setLoadError("");
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const notify = useCallback((text, kind = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // Runs an API call, shows a message, reloads the data. Returns true on success.
  const act = useCallback(async (fn, okText) => {
    try {
      await fn();
      if (okText) notify(okText);
      await refresh();
      return true;
    } catch (e) {
      notify(e.message, "error");
      return false;
    }
  }, [notify, refresh]);

  const value = { courses, students, regs, loading, loadError, toasts, refresh, notify, act };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
