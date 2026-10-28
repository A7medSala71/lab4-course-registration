import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useData } from "../DataContext.jsx";
import SeatStrip from "../components/SeatStrip.jsx";
import Modal from "../components/Modal.jsx";
import ConfirmButton from "../components/ConfirmButton.jsx";
import { seatInfo } from "../util.js";

const emptyForm = { code: "", title: "", seats: 30 };

export default function Courses() {
  const { courses, loading, act } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const q = query.trim().toLowerCase();
  const shown = courses.filter(
    (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
  );

  async function submit(e) {
    e.preventDefault();
    const ok = await act(() => api("/api/courses", "POST", form), "Added course " + form.code.toUpperCase());
    if (ok) { setOpen(false); setForm(emptyForm); }
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Courses</h1>
          <p className="sub">{courses.length} {courses.length === 1 ? "course" : "courses"}</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>Add course</button>
      </header>

      {courses.length > 0 && (
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search by code or title"
            aria-label="Search courses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className="muted">Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="empty">
          <p>No courses yet. Add the first course to open registration.</p>
          <button className="btn" onClick={() => setOpen(true)}>Add course</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty small"><p>No course matches "{query}".</p></div>
      ) : (
        <div className="panel table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Seats</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const s = seatInfo(c);
                return (
                  <tr key={c.id}>
                    <td><Link className="strong" to={"/courses/" + c.id}>{c.code}</Link></td>
                    <td>{c.title}</td>
                    <td>
                      <div className="seatcell">
                        <SeatStrip course={c} />
                        <span className="num">{s.taken}/{s.total}</span>
                        <span className={"badge " + s.tone}>{s.text}</span>
                      </div>
                    </td>
                    <td className="actions">
                      <Link className="btn ghost sm" to={"/courses/" + c.id}>Open</Link>
                      <ConfirmButton
                        confirmLabel="Confirm delete"
                        onConfirm={() => act(() => api("/api/courses/" + c.id, "DELETE"), "Deleted course " + c.code)}
                      >
                        Delete
                      </ConfirmButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <Modal title="Add course" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="form">
            <label>
              Course code
              <input autoFocus required maxLength={20} placeholder="CC101" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </label>
            <label>
              Title
              <input required maxLength={150} placeholder="Cloud Computing" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              Number of seats
              <input required type="number" min="1" value={form.seats}
                onChange={(e) => setForm({ ...form, seats: e.target.value })} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="btn">Add course</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
