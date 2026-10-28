import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../DataContext.jsx";

function useHealth() {
  const [state, setState] = useState({ kind: "checking", text: "Checking connection" });
  useEffect(() => {
    let alive = true;
    async function check() {
      let next;
      try {
        const res = await fetch("/api/health");
        const data = await res.json().catch(() => null);
        if (data && data.database === "connected") next = { kind: "ok", text: "API and database connected" };
        else if (data) next = { kind: "warn", text: "API is up, database is down" };
        else next = { kind: "down", text: "API is not responding" };
      } catch {
        next = { kind: "down", text: "Server is not reachable" };
      }
      if (alive) setState(next);
    }
    check();
    const id = setInterval(check, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return state;
}

const links = [
  { to: "/", label: "Overview", end: true },
  { to: "/courses", label: "Courses" },
  { to: "/students", label: "Students" },
  { to: "/register", label: "Registrations" },
];

export default function Layout() {
  const { toasts, loadError, refresh } = useData();
  const health = useHealth();

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="logo" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
          <span>Registrar</span>
        </div>
        <nav aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
          ))}
        </nav>
        <div className={"health " + health.kind} role="status">
          <span className="dot" aria-hidden="true" />
          {health.text}
        </div>
      </aside>

      <main className="main">
        {loadError && (
          <div className="banner" role="alert">
            <div>
              <strong>Could not load data.</strong> {loadError}
              <div className="hint">Run <code>sudo docker compose ps</code> to see which service is down.</div>
            </div>
            <button className="btn sm" onClick={refresh}>Try again</button>
          </div>
        )}
        <Outlet />
      </main>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.kind}>{t.text}</div>
        ))}
      </div>
    </div>
  );
}
