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

    // ====== for admin use ======
    listUsersAll: db.prepare(`
        SELECT id, name, email, role, created_at
        FROM users
        ORDER BY id ASC
      `),

    listUsersByRole: db.prepare(`
        SELECT id, name, email, role, created_at
        FROM users
        WHERE role = ?
        ORDER BY id ASC
    `),

      updateUserRole: db.prepare(`
        UPDATE users SET role = ?
        WHERE id = ?
    `),

    deleteUserById: db.prepare(`
        DELETE FROM users
        WHERE id = ?
    `),

    // ====== SUBJECTS ======
    listSubjects: db.prepare(`
      SELECT id, code, name
      FROM subjects
      ORDER BY code
    `),

    insertSubject: db.prepare(`
      INSERT INTO subjects(code, name)
      VALUES (?, ?)
    `),

    deleteSubjectById: db.prepare(`
      DELETE FROM subjects WHERE id = ?
    `),

    // ====== for admin use ======
    listClassesAdmin: db.prepare(`
      SELECT
        c.id,
        c.section,
        subj.code AS subjectCode,
        subj.name AS subjectName,
        u.name AS lecturerName,
        u.id AS lecturerUserId,
        subj.id AS subjectId
      FROM classes c
      JOIN subjects subj ON subj.id = c.subject_id
      JOIN users u ON u.id = c.lecturer_user_id
      ORDER BY subj.code, c.section
    `),

    insertClass: db.prepare(`
      INSERT INTO classes(subject_id, section, lecturer_user_id)
      VALUES (?, ?, ?)
    `),

    // ====== for admin use for timetable ======
    listTimetableByClass: db.prepare(`
      SELECT
        id,
        class_id,
        date,
        start_time,
        end_time,
        room,
        room_lat,
        room_lng,
        allowed_radius_m
      FROM timetable
      WHERE class_id = ?
      ORDER BY date DESC, start_time DESC
    `),

    insertTimetable: db.prepare(`
      INSERT INTO timetable(class_id, date, start_time, end_time, room, room_lat, room_lng, allowed_radius_m)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, 80)
    `),

    deleteTimetableById: db.prepare(`
      DELETE FROM timetable WHERE id = ?
    `),

    // ====== REPORTS ======
    getAttendanceReportByClass: db.prepare(`
      WITH totals AS (
        SELECT COUNT(DISTINCT s.id) AS total
        FROM sessions s
        JOIN timetable t ON t.id = s.timetable_id
        WHERE t.class_id = ?
      ),
      present AS (
        SELECT a.student_user_id, COUNT(DISTINCT a.session_id) AS present
        FROM attendance a
        JOIN sessions s ON s.id = a.session_id
        JOIN timetable t ON t.id = s.timetable_id
        WHERE t.class_id = ?
        GROUP BY a.student_user_id
      )
      SELECT
        st.student_id,
        u.name,
        u.id AS student_user_id,
        COALESCE(p.present, 0) AS attended,
        totals.total AS total,
        CASE
          WHEN totals.total = 0 THEN 0
          ELSE ROUND(COALESCE(p.present, 0) * 100.0 / totals.total)
        END AS percent
      FROM enrollments e
      JOIN users u ON u.id = e.student_user_id
      LEFT JOIN students st ON st.user_id = u.id
      CROSS JOIN totals
      LEFT JOIN present p ON p.student_user_id = u.id
      WHERE e.class_id = ?
      ORDER BY percent ASC, u.name ASC
    `),


    listAvailableClassesForStudent: db.prepare(`
        SELECT
          c.id AS classId,
          subj.code AS subjectCode,
          subj.name AS subjectName,
          c.section AS section,
          u.name AS lecturerName
        FROM classes c
        JOIN subjects subj ON subj.id = c.subject_id
        JOIN users u ON u.id = c.lecturer_user_id
        ORDER BY subj.code, c.section
      `),

    listMyEnrollments: db.prepare(`
        SELECT
          c.id AS classId,
          subj.code AS subjectCode,
          subj.name AS subjectName,
          c.section AS section,
          u.name AS lecturerName
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        JOIN subjects subj ON subj.id = c.subject_id
        JOIN users u ON u.id = c.lecturer_user_id
        WHERE e.student_user_id = ?
        ORDER BY subj.code, c.section
    `),

    isEnrolledInClass: db.prepare(`
        SELECT 1 AS ok
        FROM enrollments
        WHERE class_id = ? AND student_user_id = ?
        LIMIT 1
    `),

    //student can only enroll ONE section per subject
    isEnrolledInSameSubject: db.prepare(`
        SELECT 1 AS ok
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        WHERE e.student_user_id = ?
          AND c.subject_id = (SELECT subject_id FROM classes WHERE id = ?)
        LIMIT 1
    `),

    insertEnrollment: db.prepare(`
        INSERT INTO enrollments(class_id, student_user_id)
        VALUES (?, ?)
    `),

    deleteEnrollment: db.prepare(`
        DELETE FROM enrollments
        WHERE class_id = ? AND student_user_id = ?
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

// ====== for manage user admin ======
export function listUsers(roleOrNull = null) {
  if (!roleOrNull) return stmt.listUsersAll.all();
  return stmt.listUsersByRole.all(roleOrNull);
}


export function updateUserRole(userId, newRole) {
  return stmt.updateUserRole.run(newRole, userId);
}

export function deleteUserById(userId) {
  return stmt.deleteUserById.run(userId);
}

// ====== for manage subjects coordinator ======
export function listSubjects() {
  return stmt.listSubjects.all();
}

export function createSubject(code, name) {
  return stmt.insertSubject.run(code, name);
}

export function deleteSubjectById(subjectId) {
  return stmt.deleteSubjectById.run(subjectId);
}

// ====== for manage class timetable admin ======
export function listClassesAdmin() {
  return stmt.listClassesAdmin.all();
}

export function createClass({ subjectId, section, lecturerUserId }) {
  return stmt.insertClass.run(subjectId, section, lecturerUserId);
}

// ====== for manage class timetable admin ======
export function listTimetableByClass(classId) {
  return stmt.listTimetableByClass.all(classId);
}

export function createTimetable({ classId, date, start_time, end_time, room }) {
  return stmt.insertTimetable.run(classId, date, start_time, end_time, room);
}

export function deleteTimetableById(timetableId) {
  return stmt.deleteTimetableById.run(timetableId);
}

// ====== REPORTS ======
export function getAttendanceReportByClass(classId) {
  // note: same classId passed 3 times due to CTE usage
  return stmt.getAttendanceReportByClass.all(classId, classId, classId);
}

// ====== This is for student enrollment function cuh, dont change ======
export function listAvailableClassesForStudent() {
  return stmt.listAvailableClassesForStudent.all();
}

export function listMyEnrollments(studentUserId) {
  return stmt.listMyEnrollments.all(studentUserId);
}

export function isEnrolledInClass(classId, studentUserId) {
  return !!stmt.isEnrolledInClass.get(classId, studentUserId);
}

export function isEnrolledInSameSubject(studentUserId, classId) {
  return !!stmt.isEnrolledInSameSubject.get(studentUserId, classId);
}

export function enrollStudentInClass(studentUserId, classId) {
  return stmt.insertEnrollment.run(classId, studentUserId);
}

export function unenrollStudentFromClass(studentUserId, classId) {
  return stmt.deleteEnrollment.run(classId, studentUserId);
}
