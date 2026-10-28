import os
import time
import mysql.connector
from flask import Flask, jsonify, request
from mysql.connector import Error

app = Flask(__name__)

# Connection settings come from environment variables (set in compose.yaml)
DB_HOST = os.environ.get("DB_HOST", "db")
DB_NAME = os.environ["MYSQL_DATABASE"]
DB_USER = os.environ["MYSQL_USER"]
DB_PASSWORD = os.environ["MYSQL_PASSWORD"]


# ---------- Database access ----------
def get_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
    )


def initialize_database():
    """Create the table. Retry, because MySQL may still be starting."""
    for attempt in range(30):
        try:
            connection = get_connection()
            cursor = connection.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL
                )
            """)
            connection.commit()
            cursor.close()
            connection.close()
            print("Database initialized successfully.", flush=True)
            return
        except Error as error:
            print(f"Database not ready ({attempt + 1}/30): {error}", flush=True)
            time.sleep(2)
    raise RuntimeError("Could not connect to the database.")


# ---------- Business logic (the rules of the application) ----------
def clean_title(raw_title):
    """Return the cleaned title, or None if it breaks the rules."""
    title = str(raw_title or "").strip()
    if not title or len(title) > 255:
        return None
    return title


# ---------- API (the URLs the frontend can call) ----------
@app.route("/api/health", methods=["GET"])
def health():
    try:
        get_connection().close()
        return jsonify({"api": "running", "database": "connected"})
    except Error:
        return jsonify({"api": "running", "database": "unavailable"}), 503


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT id, title FROM tasks ORDER BY id")
    tasks = cursor.fetchall()
    cursor.close()
    connection.close()
    return jsonify(tasks)


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json(silent=True) or {}
    title = clean_title(data.get("title"))
    if title is None:
        return jsonify({"error": "Task title must be 1 to 255 characters"}), 400
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("INSERT INTO tasks (title) VALUES (%s)", (title,))
    connection.commit()
    task_id = cursor.lastrowid
    cursor.close()
    connection.close()
    return jsonify({"id": task_id, "title": title}), 201


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
    connection.commit()
    deleted = cursor.rowcount
    cursor.close()
    connection.close()
    if deleted == 0:
        return jsonify({"error": "Task not found"}), 404
    return jsonify({"message": "Task deleted"})


if __name__ == "__main__":
    initialize_database()
    app.run(host="0.0.0.0", port=5000)
