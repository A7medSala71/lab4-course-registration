CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  CONSTRAINT uq_email UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  title VARCHAR(150) NOT NULL,
  seats INT NOT NULL CHECK (seats > 0),
  CONSTRAINT uq_code UNIQUE (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  CONSTRAINT uq_registration UNIQUE (student_id, course_id),
  CONSTRAINT fk_reg_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_reg_course  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO courses (code, title, seats) VALUES
  ('CC101', 'Cloud Computing', 2),
  ('NET201', 'Computer Networks', 30);

INSERT INTO students (name, email) VALUES
  ('Sample Student', 'sample@example.com');
