// lib/db.js
import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || "./SmartClassroom.db";
export const db = new Database(dbPath);


export function withTx(fn) {
  return db.transaction(fn)();
}

export function initDB() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('STUDENT','LECTURER','ADMIN','COORDINATOR')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      user_id INTEGER PRIMARY KEY,
      student_id TEXT NOT NULL UNIQUE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      lecturer_user_id INTEGER NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(lecturer_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      date TEXT NOT NULL,            -- YYYY-MM-DD
      start_time TEXT NOT NULL,      -- HH:MM
      end_time TEXT NOT NULL,        -- HH:MM
      room TEXT NOT NULL,
      room_lat REAL,                 -- optional
      room_lng REAL,                 -- optional
      allowed_radius_m INTEGER NOT NULL DEFAULT 80,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      class_id INTEGER NOT NULL,
      student_user_id INTEGER NOT NULL,
      PRIMARY KEY(class_id, student_user_id),
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(student_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timetable_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE','ENDED')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      room_lat REAL,
      room_lng REAL,
      room_accuracy_m REAL,
      tolerance INTEGER NOT NULL DEFAULT 40,
      FOREIGN KEY(timetable_id) REFERENCES timetable(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      session_id INTEGER NOT NULL,
      student_user_id INTEGER NOT NULL,
      checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'PRESENT',
      PRIMARY KEY(session_id, student_user_id),
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(student_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_user_id INTEGER NOT NULL,
      class_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT,
      FOREIGN KEY(student_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings(key, value) VALUES ('attendance_threshold', '80');
    INSERT OR IGNORE INTO settings(key, value) VALUES ('student_id_counter', '1000');

  `);
}

initDB() ;

const stmt = {
  getUserById: db.prepare(`SELECT id, name, email, role, created_at FROM users WHERE id = ?`),
  getUserByEmail: db.prepare(`SELECT id, name, email, role, password_hash FROM users WHERE email = ?`),

  insertUser: db.prepare(`
    INSERT INTO users(name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `),

  insertStudent: db.prepare(`
    INSERT INTO students(user_id, student_id)
    VALUES (?, ?)
  `),

  ensureSetting: db.prepare(`INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)`),
  getSetting: db.prepare(`SELECT value FROM settings WHERE key = ?`),
  setSetting: db.prepare(`UPDATE settings SET value = ? WHERE key = ?`),

  getAttendanceThreshold: db.prepare(`
    SELECT value
    FROM settings
    WHERE key = 'attendance_threshold'
  `),

  listStudentEnrolledClasses: db.prepare(`
    SELECT
      c.id AS classId,
      subj.code AS subjectCode,
      subj.name AS subjectName,
      c.section AS section
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN subjects subj ON subj.id = c.subject_id
    WHERE e.student_user_id = ?
    ORDER BY subj.code, c.section
  `),

  countSessionsByClass: db.prepare(`
    SELECT COUNT(DISTINCT s.id) AS cnt
    FROM sessions s
    JOIN timetable t ON t.id = s.timetable_id
    WHERE t.class_id = ?
  `),

  countPresentByStudentInClass: db.prepare(`
    SELECT COUNT(DISTINCT a.session_id) AS cnt
    FROM attendance a
    JOIN sessions s ON s.id = a.session_id
    JOIN timetable t ON t.id = s.timetable_id
    WHERE a.student_user_id = ? AND t.class_id = ?
  `),

  notificationExistsToday: db.prepare(`
    SELECT 1
    FROM notifications
    WHERE student_user_id = ?
      AND class_id = ?
      AND title = ?
      AND message = ?
      AND date(created_at) = date('now')
    LIMIT 1
  `),

  insertNotification: db.prepare(`
    INSERT INTO notifications(student_user_id, class_id, title, message)
    VALUES (?, ?, ?, ?)
  `),

  listNotificationsForStudent: db.prepare(`
    SELECT
      n.id,
      n.title,
      n.message,
      n.created_at,
      n.read_at,
      n.class_id AS classId,
      subj.code AS subjectCode,
      subj.name AS subjectName,
      c.section AS section
    FROM notifications n
    LEFT JOIN classes c ON c.id = n.class_id
    LEFT JOIN subjects subj ON subj.id = c.subject_id
    WHERE n.student_user_id = ?
    ORDER BY n.created_at DESC
  `),

  markNotificationReadForStudent: db.prepare(`
    UPDATE notifications
    SET read_at = datetime('now')
    WHERE id = ? AND student_user_id = ?
  `),
};

//
export function getUserById(id) {
  return stmt.getUserById.get(id);
}

export function getUserByEmail(email) {
  return stmt.getUserByEmail.get(email);
}

export function insertUser({ name, email, passwordHash, role }) {
  return stmt.insertUser.run(name, email, passwordHash, role);
}

export function insertStudent({ userId, studentId }) {
  return stmt.insertStudent.run(userId, studentId);
}

export function ensureSetting(key, defaultValue) {
  stmt.ensureSetting.run(key, String(defaultValue));
}

export function getSetting(key) {
  return stmt.getSetting.get(key)?.value ?? null;
}

export function setSetting(key, value) {
  stmt.setSetting.run(String(value), key);
}

export function getAttendanceThreshold() {
  const row = stmt.getAttendanceThreshold.get();
  return Number(row?.value || 80);
}

export function listStudentEnrolledClasses(studentUserId) {
  return stmt.listStudentEnrolledClasses.all(studentUserId);
}

export function countSessionsByClass(classId) {
  const row = stmt.countSessionsByClass.get(classId);
  return Number(row?.cnt || 0);
}

export function countPresentByStudentInClass(studentUserId, classId) {
  const row = stmt.countPresentByStudentInClass.get(studentUserId, classId);
  return Number(row?.cnt || 0);
}

export function notificationExistsToday({ studentUserId, classId, title, message }) {
  const row = stmt.notificationExistsToday.get(studentUserId, classId, title, message);
  return !!row;
}

export function createNotification({ studentUserId, classId, title, message }) {
  stmt.insertNotification.run(studentUserId, classId, title, message);
}

export function listNotificationsForStudent(studentUserId) {
  return stmt.listNotificationsForStudent.all(studentUserId);
}

export function markNotificationReadForStudent(studentUserId, notificationId) {
  stmt.markNotificationReadForStudent.run(notificationId, studentUserId);
}
