import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useData } from "../DataContext.jsx";
import SeatStrip from "../components/SeatStrip.jsx";
import ConfirmButton from "../components/ConfirmButton.jsx";
import { seatInfo } from "../util.js";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses, students, regs, loading, act } = useData();
  const [studentId, setStudentId] = useState("");

  if (loading) return <p className="muted">Loading course...</p>;

  const course = courses.find((c) => String(c.id) === id);
  if (!course) {
    return (
      <div className="empty">
        <h1>Course not found</h1>
        <p>It may have been deleted.</p>
        <Link className="btn" to="/courses">Back to courses</Link>
      </div>
    );
  }

  const s = seatInfo(course);
  const roster = regs.filter((r) => r.course_id === course.id);
  const inCourse = new Set(roster.map((r) => r.student_id));
  const available = students.filter((st) => !inCourse.has(st.id));

  async function enroll(e) {
    e.preventDefault();
    const st = students.find((x) => String(x.id) === studentId);
    const ok = await act(
      () => api("/api/registrations", "POST", { student_id: Number(studentId), course_id: course.id }),
      "Registered " + (st ? st.name : "student") + " in " + course.code
    );
    if (ok) setStudentId("");
  }

  return (
    <>
      <p className="crumb"><Link to="/courses">Courses</Link> / {course.code}</p>

      <header className="page-head">
        <div>
          <h1 className="course-code">{course.code}</h1>
          <p className="sub">{course.title}</p>
        </div>
        <ConfirmButton
          confirmLabel="Confirm delete"
          onConfirm={async () => {
            const ok = await act(() => api("/api/courses/" + course.id, "DELETE"), "Deleted course " + course.code);
            if (ok) navigate("/courses");
          }}
        >
          Delete course
        </ConfirmButton>
      </header>

      <section className="seatpanel panel">
        <SeatStrip course={course} />
        <p>
          <strong>{s.taken} of {s.total} seats taken.</strong>{" "}
          <span className={"badge " + s.tone}>{s.text}</span>
        </p>
      </section>

      <div className="split">
        <section>
          <h2>Registered students ({roster.length})</h2>
          {roster.length === 0 ? (
            <div className="empty small"><p>No students registered yet.</p></div>
          ) : (
            <div className="panel table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {roster.map((r) => (
                    <tr key={r.student_id}>
                      <td className="strong">{r.name}</td>
                      <td className="muted">{r.email}</td>
                      <td className="actions">
                        <ConfirmButton
                          confirmLabel="Confirm cancel"
                          onConfirm={() =>
                            act(() => api("/api/courses/" + course.id + "/students/" + r.student_id, "DELETE"),
                              "Cancelled registration for " + r.name)
                          }
                        >
                          Cancel registration
                        </ConfirmButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2>Register a student</h2>
          <form className="form panel pad" onSubmit={enroll}>
            {students.length === 0 ? (
              <p className="muted">There are no students yet. <Link to="/students">Add a student</Link> first.</p>
            ) : available.length === 0 ? (
              <p className="muted">Every student is already registered in this course.</p>
            ) : s.left === 0 ? (
              <p className="muted">This course is full. Cancel a registration to free a seat.</p>
            ) : (
              <>
                <label>
                  Student
                  <select required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Choose a student</option>
                    {available.map((st) => (
                      <option key={st.id} value={st.id}>{st.name} ({st.email})</option>
                    ))}
                  </select>
                </label>
                <button className="btn" type="submit">Register student</button>
              </>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
