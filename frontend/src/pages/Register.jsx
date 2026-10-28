import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useData } from "../DataContext.jsx";
import SeatStrip from "../components/SeatStrip.jsx";
import ConfirmButton from "../components/ConfirmButton.jsx";
import { seatInfo } from "../util.js";

export default function Register() {
  const { students, courses, regs, loading, act } = useData();
  const [params] = useSearchParams();
  const [studentId, setStudentId] = useState(params.get("student") || "");
  const [courseId, setCourseId] = useState(params.get("course") || "");
  const [query, setQuery] = useState("");

  const course = courses.find((c) => String(c.id) === courseId);
  const student = students.find((s) => String(s.id) === studentId);
  const info = course ? seatInfo(course) : null;
  const already = regs.some((r) => String(r.student_id) === studentId && String(r.course_id) === courseId);

  let blocker = "";
  if (student && course && already) blocker = student.name + " is already registered in " + course.code + ".";
  else if (info && info.left === 0) blocker = course.code + " is full. Cancel a registration to free a seat.";

  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));
  const q = query.trim().toLowerCase();
  const shown = regs.filter((r) => {
    const c = courseById[r.course_id];
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (c && c.code.toLowerCase().includes(q))
    );
  });

  async function submit(e) {
    e.preventDefault();
    const ok = await act(
      () => api("/api/registrations", "POST", { student_id: Number(studentId), course_id: Number(courseId) }),
      "Registered " + student.name + " in " + course.code
    );
    if (ok) setStudentId("");
  }

  if (loading) return <p className="muted">Loading data...</p>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Registrations</h1>
          <p className="sub">Register a student in a course, or cancel an existing registration.</p>
        </div>
      </header>

      <section className="panel pad regform">
        {students.length === 0 || courses.length === 0 ? (
          <p className="muted">
            You need at least one student and one course first.{" "}
            <Link to="/students">Students</Link> / <Link to="/courses">Courses</Link>
          </p>
        ) : (
          <form className="form inline" onSubmit={submit}>
            <label>
              Student
              <select required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Choose a student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>
              Course
              <select required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">Choose a course</option>
                {courses.map((c) => {
                  const s = seatInfo(c);
                  return <option key={c.id} value={c.id}>{c.code} - {c.title} ({s.text})</option>;
                })}
              </select>
            </label>
            <button className="btn" type="submit" disabled={!studentId || !courseId || !!blocker}>
              Register student
            </button>
          </form>
        )}
        {course && (
          <div className="preview">
            <SeatStrip course={course} />
            <span className={"badge " + info.tone}>{info.text}</span>
            {blocker && <span className="blocker">{blocker}</span>}
          </div>
        )}
      </section>

      <h2>All registrations ({regs.length})</h2>
      {regs.length === 0 ? (
        <div className="empty small"><p>No registrations yet. Use the form above to register the first student.</p></div>
      ) : (
        <>
          <div className="toolbar">
            <input
              type="search"
              placeholder="Search by student, email or course code"
              aria-label="Search registrations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {shown.length === 0 ? (
            <div className="empty small"><p>No registration matches "{query}".</p></div>
          ) : (
            <div className="panel table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Student</th><th>Email</th><th>Course</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const c = courseById[r.course_id];
                    return (
                      <tr key={r.course_id + "-" + r.student_id}>
                        <td className="strong">{r.name}</td>
                        <td className="muted">{r.email}</td>
                        <td>
                          <Link className="strong" to={"/courses/" + r.course_id}>{c ? c.code : "#" + r.course_id}</Link>
                          {c && <span className="muted"> {c.title}</span>}
                        </td>
                        <td className="actions">
                          <ConfirmButton
                            confirmLabel="Confirm cancel"
                            onConfirm={() =>
                              act(() => api("/api/courses/" + r.course_id + "/students/" + r.student_id, "DELETE"),
                                "Cancelled registration for " + r.name)
                            }
                          >
                            Cancel registration
                          </ConfirmButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
