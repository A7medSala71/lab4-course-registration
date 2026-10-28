import { Link } from "react-router-dom";
import { useData } from "../DataContext.jsx";
import SeatStrip from "../components/SeatStrip.jsx";
import { seatInfo } from "../util.js";

export default function Dashboard() {
  const { courses, students, regs, loading } = useData();

  if (loading) return <p className="muted">Loading data...</p>;

  const totalSeats = courses.reduce((n, c) => n + c.seats, 0);
  const taken = courses.reduce((n, c) => n + Number(c.registered), 0);
  const filled = totalSeats ? Math.round((taken / totalSeats) * 100) : 0;

  const enrolled = new Set(regs.map((r) => r.student_id));
  const unplaced = students.filter((s) => !enrolled.has(s.id));
  const byFill = [...courses]
    .sort((a, b) => Number(b.registered) / b.seats - Number(a.registered) / a.seats)
    .slice(0, 6);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">Seats, students and registrations at a glance.</p>
        </div>
        <Link className="btn" to="/register">Register a student</Link>
      </header>

      <section className="figures panel" aria-label="Totals">
        <div><strong>{courses.length}</strong><span>Courses</span></div>
        <div><strong>{students.length}</strong><span>Students</span></div>
        <div><strong>{regs.length}</strong><span>Registrations</span></div>
        <div><strong>{filled}%</strong><span>Seats taken ({taken} of {totalSeats})</span></div>
      </section>

      <div className="split">
        <section>
          <h2>Seat availability</h2>
          {byFill.length === 0 ? (
            <div className="empty small">
              <p>No courses yet. Add a course to open registration.</p>
              <Link className="btn" to="/courses">Add a course</Link>
            </div>
          ) : (
            <ul className="rows panel">
              {byFill.map((c) => {
                const s = seatInfo(c);
                return (
                  <li key={c.id}>
                    <div className="grow">
                      <Link className="strong" to={"/courses/" + c.id}>{c.code}</Link>
                      <span className="muted"> {c.title}</span>
                    </div>
                    <SeatStrip course={c} />
                    <span className={"badge " + s.tone}>{s.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2>Students without a course</h2>
          {unplaced.length === 0 ? (
            <div className="empty small">
              <p>{students.length === 0 ? "No students yet." : "Every student is registered in at least one course."}</p>
            </div>
          ) : (
            <ul className="rows panel">
              {unplaced.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <div className="grow">
                    <span className="strong">{s.name}</span>
                    <div className="muted small-text">{s.email}</div>
                  </div>
                  <Link className="btn ghost sm" to={"/register?student=" + s.id}>Register</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
