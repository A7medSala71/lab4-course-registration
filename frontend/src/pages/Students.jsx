import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useData } from "../DataContext.jsx";
import Modal from "../components/Modal.jsx";

const emptyForm = { name: "", email: "" };

export default function Students() {
  const { students, courses, regs, loading, act } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));
  const q = query.trim().toLowerCase();
  const shown = students.filter(
    (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  );

  async function submit(e) {
    e.preventDefault();
    const ok = await act(() => api("/api/students", "POST", form), "Added student " + form.name.trim());
    if (ok) { setOpen(false); setForm(emptyForm); }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Students</h1>
          <p className="sub">{students.length} {students.length === 1 ? "student" : "students"}</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>Add student</button>
      </header>

      {students.length > 0 && (
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search by name or email"
            aria-label="Search students"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className="muted">Loading students...</p>
      ) : students.length === 0 ? (
        <div className="empty">
          <p>No students yet. Add a student to start registering them in courses.</p>
          <button className="btn" onClick={() => setOpen(true)}>Add student</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty small"><p>No student matches "{query}".</p></div>
      ) : (
        <div className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Courses</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => {
                const mine = regs.filter((r) => r.student_id === s.id);
                return (
                  <tr key={s.id}>
                    <td className="strong">{s.name}</td>
                    <td className="muted">{s.email}</td>
                    <td>
                      {mine.length === 0 ? (
                        <span className="muted">None yet</span>
                      ) : (
                        <span className="chips">
                          {mine.map((r) => (
                            <Link key={r.course_id} className="chip" to={"/courses/" + r.course_id}>
                              {courseById[r.course_id] ? courseById[r.course_id].code : "#" + r.course_id}
                            </Link>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="actions">
                      <Link className="btn ghost sm" to={"/register?student=" + s.id}>Register</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="Add student" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>
              Full name
              <input autoFocus required maxLength={100} placeholder="Ali Hassan" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Email
              <input required type="email" maxLength={150} placeholder="ali@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn">Add student</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
