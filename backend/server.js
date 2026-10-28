const express = require("express");
const mysql = require("mysql2/promise");
const { createClient } = require("redis");

const app = express();
app.use(express.json());

// One log line per request, so `docker compose logs backend` shows the traffic
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const cache = res.get("X-Cache") ? " cache=" + res.get("X-Cache") : "";
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms${cache}`);
  });
  next();
});

// Connection settings come from environment variables (set in compose.yaml)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------- Cache (Redis) ----------
// The course list is cached for 60 seconds and cleared on every change.
// If Redis is down the API keeps working and reads straight from MySQL.
const cache = createClient({ url: process.env.REDIS_URL || "redis://cache:6379", disableOfflineQueue: true });
cache.on("error", (e) => console.error("Redis error:", e.message));
cache.connect().catch((e) => console.error("Redis not available:", e.message));
const COURSES_KEY = "courses:list";

async function cacheGet(key) {
  if (!cache.isReady) return null;
  try { return await cache.get(key); } catch { return null; }
}
async function cacheSet(key, value) {
  if (!cache.isReady) return;
  try { await cache.set(key, value, { EX: 60 }); } catch {}
}
async function clearCourseCache() {
  if (!cache.isReady) return;
  try { await cache.del(COURSES_KEY); } catch {}
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// ---------- Business logic (the rules) ----------
function cleanCourse(body) {
  const code = String(body.code || "").trim().toUpperCase();
  const title = String(body.title || "").trim();
  const seats = Number(body.seats);
  if (!code || code.length > 20) throw new HttpError(400, "Course code must be 1 to 20 characters");
  if (!title || title.length > 150) throw new HttpError(400, "Course title must be 1 to 150 characters");
  if (!Number.isInteger(seats) || seats < 1) throw new HttpError(400, "Seats must be a whole number of at least 1");
  return { code, title, seats };
}

function cleanStudent(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!name || name.length > 100) throw new HttpError(400, "Student name must be 1 to 100 characters");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150)
    throw new HttpError(400, "Invalid email address");
  return { name, email };
}

// ---------- API ----------
app.get("/api/health", async (req, res) => {
  const cacheState = cache.isReady ? "connected" : "unavailable";
  try {
    await pool.query("SELECT 1");
    res.json({ api: "running", database: "connected", cache: cacheState });
  } catch (e) {
    res.status(503).json({ api: "running", database: "unavailable", cache: cacheState });
  }
});

// Courses
app.get("/api/courses", wrap(async (req, res) => {
  const cached = await cacheGet(COURSES_KEY);
  if (cached) {
    res.set("X-Cache", "HIT").type("application/json").send(cached);
    return;
  }
  const [rows] = await pool.query(`
    SELECT c.id, c.code, c.title, c.seats, COUNT(r.id) AS registered
    FROM courses c LEFT JOIN registrations r ON r.course_id = c.id
    GROUP BY c.id ORDER BY c.id`);
  const body = JSON.stringify(rows);
  await cacheSet(COURSES_KEY, body);
  res.set("X-Cache", "MISS").type("application/json").send(body);
}));

app.post("/api/courses", wrap(async (req, res) => {
  const { code, title, seats } = cleanCourse(req.body || {});
  const [result] = await pool.query(
    "INSERT INTO courses (code, title, seats) VALUES (?, ?, ?)", [code, title, seats]);
  await clearCourseCache();
  res.status(201).json({ id: result.insertId, code, title, seats });
}));

app.delete("/api/courses/:id", wrap(async (req, res) => {
  const [result] = await pool.query("DELETE FROM courses WHERE id = ?", [req.params.id]);
  if (result.affectedRows === 0) throw new HttpError(404, "Course not found");
  await clearCourseCache();
  res.json({ message: "Course deleted" });
}));

// Students of one course
app.get("/api/courses/:id/students", wrap(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT s.id, s.name, s.email
    FROM registrations r JOIN students s ON s.id = r.student_id
    WHERE r.course_id = ? ORDER BY s.name`, [req.params.id]);
  res.json(rows);
}));

// Students
app.get("/api/students", wrap(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name, email FROM students ORDER BY id");
  res.json(rows);
}));

app.post("/api/students", wrap(async (req, res) => {
  const { name, email } = cleanStudent(req.body || {});
  const [result] = await pool.query(
    "INSERT INTO students (name, email) VALUES (?, ?)", [name, email]);
  res.status(201).json({ id: result.insertId, name, email });
}));

// Registrations
app.get("/api/registrations", wrap(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT r.course_id, r.student_id, s.name, s.email
    FROM registrations r JOIN students s ON s.id = r.student_id
    ORDER BY r.course_id, s.name`);
  res.json(rows);
}));

app.post("/api/registrations", wrap(async (req, res) => {
  const studentId = Number((req.body || {}).student_id);
  const courseId = Number((req.body || {}).course_id);
  if (!Number.isInteger(studentId) || !Number.isInteger(courseId))
    throw new HttpError(400, "student_id and course_id are required");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the course row so two requests cannot take the last seat together
    const [courses] = await conn.query("SELECT id, seats FROM courses WHERE id = ? FOR UPDATE", [courseId]);
    if (courses.length === 0) throw new HttpError(404, "Course not found");
    const [students] = await conn.query("SELECT id FROM students WHERE id = ?", [studentId]);
    if (students.length === 0) throw new HttpError(404, "Student not found");

    const [[{ taken }]] = await conn.query(
      "SELECT COUNT(*) AS taken FROM registrations WHERE course_id = ?", [courseId]);
    if (taken >= courses[0].seats) throw new HttpError(409, "Course is full");

    await conn.query("INSERT INTO registrations (student_id, course_id) VALUES (?, ?)", [studentId, courseId]);
    await conn.commit();
    await clearCourseCache();
    res.status(201).json({ student_id: studentId, course_id: courseId });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

app.delete("/api/courses/:courseId/students/:studentId", wrap(async (req, res) => {
  const [result] = await pool.query(
    "DELETE FROM registrations WHERE course_id = ? AND student_id = ?",
    [req.params.courseId, req.params.studentId]);
  if (result.affectedRows === 0) throw new HttpError(404, "Registration not found");
  await clearCourseCache();
  res.json({ message: "Registration cancelled" });
}));

// ---------- Error handling ----------
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code === "ER_DUP_ENTRY") {
    const m = err.sqlMessage || "";
    if (m.includes("uq_registration")) return res.status(409).json({ error: "Student is already registered in this course" });
    if (m.includes("uq_email")) return res.status(409).json({ error: "Email already exists" });
    if (m.includes("uq_code")) return res.status(409).json({ error: "Course code already exists" });
    return res.status(409).json({ error: "Duplicate value" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(3000, "0.0.0.0", () => console.log("API listening on port 3000"));
