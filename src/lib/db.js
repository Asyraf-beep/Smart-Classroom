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
      room_lat REAL,
      room_lng REAL,
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

    countStudentEnrollments: db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM enrollments
      WHERE student_user_id = ?
    `),

    countStudentUnreadNotifications: db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM notifications
      WHERE student_user_id = ? AND read_at IS NULL
    `),

    countStudentTotalSessions: db.prepare(`
      SELECT COUNT(DISTINCT s.id) AS cnt
      FROM sessions s
      JOIN timetable t ON t.id = s.timetable_id
      JOIN enrollments e ON e.class_id = t.class_id
      WHERE e.student_user_id = ?
    `),

    countStudentPresentSessions: db.prepare(`
      SELECT COUNT(DISTINCT a.session_id) AS cnt
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      JOIN timetable t ON t.id = s.timetable_id
      JOIN enrollments e ON e.class_id = t.class_id
      WHERE a.student_user_id = ? AND e.student_user_id = ?
    `),

    countStudentLowAttendanceClasses: db.prepare(`
      WITH threshold(val) AS (SELECT ?),
      totals AS (
        SELECT t.class_id, COUNT(DISTINCT s.id) AS total
        FROM sessions s
        JOIN timetable t ON t.id = s.timetable_id
        JOIN enrollments e ON e.class_id = t.class_id
        WHERE e.student_user_id = ?
        GROUP BY t.class_id
      ),
      present AS (
        SELECT t.class_id, COUNT(DISTINCT a.session_id) AS present
        FROM attendance a
        JOIN sessions s ON s.id = a.session_id
        JOIN timetable t ON t.id = s.timetable_id
        WHERE a.student_user_id = ?
        GROUP BY t.class_id
      )
      SELECT COUNT(*) AS cnt
      FROM totals
      LEFT JOIN present USING(class_id)
      WHERE totals.total > 0
        AND (COALESCE(present.present, 0) * 100.0 / totals.total) < (SELECT val FROM threshold)
    `),

    listStudentRecentAttendance: db.prepare(`
      SELECT
        a.checked_in_at AS time,
        a.status AS status,
        subj.code AS subjectCode,
        c.section AS section,
        t.date AS date,
        t.start_time AS start_time,
        t.end_time AS end_time,
        t.room AS room
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      JOIN subjects subj ON subj.id = c.subject_id
      WHERE a.student_user_id = ?
      ORDER BY a.checked_in_at DESC
      LIMIT ?
    `),

    listStudentRecentNotifications: db.prepare(`
      SELECT
        n.created_at AS time,
        n.title,
        n.message,
        subj.code AS subjectCode,
        c.section AS section
      FROM notifications n
      LEFT JOIN classes c ON c.id = n.class_id
      LEFT JOIN subjects subj ON subj.id = c.subject_id
      WHERE n.student_user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ?
    `),

    // ===== Dashboard: LECTURER =====
    countLecturerClasses: db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM classes
      WHERE lecturer_user_id = ?
    `),

    countLecturerTodayTimetables: db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM timetable t
      JOIN classes c ON c.id = t.class_id
      WHERE c.lecturer_user_id = ? AND t.date = date('now')
    `),

    countLecturerActiveSessions: db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM sessions s
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      WHERE c.lecturer_user_id = ? AND s.status = 'ACTIVE'
    `),

    countLecturerTodayCheckins: db.prepare(`
      SELECT COUNT(*) AS cnt
      FROM attendance a
      JOIN sessions s ON s.id = a.session_id
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      WHERE c.lecturer_user_id = ?
        AND date(a.checked_in_at) = date('now')
    `),

    listLecturerRecentCheckins: db.prepare(`
      SELECT
        a.checked_in_at AS time,
        st.student_id AS studentId,
        u.name AS studentName,
        subj.code AS subjectCode,
        c.section AS section
      FROM attendance a
      JOIN users u ON u.id = a.student_user_id
      JOIN students st ON st.user_id = u.id
      JOIN sessions s ON s.id = a.session_id
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      JOIN subjects subj ON subj.id = c.subject_id
      WHERE c.lecturer_user_id = ?
      ORDER BY a.checked_in_at DESC
      LIMIT ?
    `),

    listLecturerRecentSessions: db.prepare(`
      SELECT
        s.started_at AS time,
        s.status AS status,
        subj.code AS subjectCode,
        c.section AS section,
        t.date AS date,
        t.start_time AS start_time,
        t.end_time AS end_time,
        t.room AS room
      FROM sessions s
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      JOIN subjects subj ON subj.id = c.subject_id
      WHERE c.lecturer_user_id = ?
      ORDER BY s.started_at DESC
      LIMIT ?
    `),

    // ===== Dashboard: ADMIN =====
    countUsersAll: db.prepare(`SELECT COUNT(*) AS cnt FROM users`),
    countUsersByRole: db.prepare(`SELECT COUNT(*) AS cnt FROM users WHERE role = ?`),
    countSubjectsAll: db.prepare(`SELECT COUNT(*) AS cnt FROM subjects`),
    countClassesAll: db.prepare(`SELECT COUNT(*) AS cnt FROM classes`),
    countActiveSessionsAll: db.prepare(`SELECT COUNT(*) AS cnt FROM sessions WHERE status='ACTIVE'`),

    listRecentUsers: db.prepare(`
      SELECT created_at AS time, name, email, role
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
    `),

    listRecentSessionsAll: db.prepare(`
      SELECT started_at AS time, status, timetable_id
      FROM sessions
      ORDER BY started_at DESC
      LIMIT ?
    `),

    // ===== Dashboard: COORDINATOR =====
    countLowAttendanceStudentsAll: db.prepare(`
      WITH threshold(val) AS (SELECT ?),
      totals AS (
        SELECT t.class_id, COUNT(DISTINCT s.id) AS total
        FROM sessions s
        JOIN timetable t ON t.id = s.timetable_id
        GROUP BY t.class_id
      ),
      present AS (
        SELECT a.student_user_id, t.class_id, COUNT(DISTINCT a.session_id) AS present
        FROM attendance a
        JOIN sessions s ON s.id = a.session_id
        JOIN timetable t ON t.id = s.timetable_id
        GROUP BY a.student_user_id, t.class_id
      ),
      perc AS (
        SELECT
          e.student_user_id,
          e.class_id,
          totals.total,
          COALESCE(present.present, 0) AS present
        FROM enrollments e
        JOIN totals ON totals.class_id = e.class_id
        LEFT JOIN present ON present.student_user_id = e.student_user_id AND present.class_id = e.class_id
        WHERE totals.total > 0
      )
      SELECT COUNT(DISTINCT student_user_id) AS cnt
      FROM perc
      WHERE (present * 100.0 / total) < (SELECT val FROM threshold)
    `),

    listLowAttendanceCasesAll: db.prepare(`
      WITH threshold(val) AS (SELECT ?),
      totals AS (
        SELECT t.class_id, COUNT(DISTINCT s.id) AS total
        FROM sessions s
        JOIN timetable t ON t.id = s.timetable_id
        GROUP BY t.class_id
      ),
      present AS (
        SELECT a.student_user_id, t.class_id, COUNT(DISTINCT a.session_id) AS present
        FROM attendance a
        JOIN sessions s ON s.id = a.session_id
        JOIN timetable t ON t.id = s.timetable_id
        GROUP BY a.student_user_id, t.class_id
      ),
      perc AS (
        SELECT
          e.student_user_id,
          e.class_id,
          totals.total,
          COALESCE(present.present, 0) AS present,
          (COALESCE(present.present, 0) * 100.0 / totals.total) AS pct
        FROM enrollments e
        JOIN totals ON totals.class_id = e.class_id
        LEFT JOIN present ON present.student_user_id = e.student_user_id AND present.class_id = e.class_id
        WHERE totals.total > 0
      )
      SELECT
        u.name AS studentName,
        st.student_id AS studentId,
        subj.code AS subjectCode,
        c.section AS section,
        ROUND(perc.pct) AS pct,
        datetime('now') AS time
      FROM perc
      JOIN users u ON u.id = perc.student_user_id
      JOIN students st ON st.user_id = u.id
      JOIN classes c ON c.id = perc.class_id
      JOIN subjects subj ON subj.id = c.subject_id
      WHERE perc.pct < (SELECT val FROM threshold)
      ORDER BY perc.pct ASC
      LIMIT ?
    `),

    getLecturerUserIdBySessionId: db.prepare(`
      SELECT c.lecturer_user_id AS lecturerUserId
      FROM sessions s
      JOIN timetable tt ON tt.id = s.timetable_id
      JOIN classes c ON c.id = tt.class_id
      WHERE s.id = ?
    `),

    updateAttendanceStatus: db.prepare(`
      UPDATE attendance
      SET status = ?
      WHERE session_id = ? AND student_user_id = ?
    `),

    listStudentScheduleByDate: db.prepare(`
        SELECT
          t.id AS timetableId,
          t.date AS date,
          t.start_time AS startTime,
          t.end_time AS endTime,
          t.room AS room,

          c.id AS classId,
          c.section AS section,

          subj.code AS subjectCode,
          subj.name AS subjectName,

          lu.name AS lecturerName
        FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        JOIN timetable t ON t.class_id = c.id
        JOIN subjects subj ON subj.id = c.subject_id
        JOIN users lu ON lu.id = c.lecturer_user_id
        WHERE e.student_user_id = ?
          AND t.date = ?
        ORDER BY t.start_time ASC
    `),

    // ✅ lecturer sessions list (for dropdown)
    listSessionsForLecturer: db.prepare(`
      SELECT
        s.id AS sessionId,
        s.status AS sessionStatus,
        s.started_at,
        t.date,
        t.start_time,
        t.end_time,
        t.room,
        subj.code AS subjectCode,
        subj.name AS subjectName,
        c.section
      FROM sessions s
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      JOIN subjects subj ON subj.id = c.subject_id
      WHERE c.lecturer_user_id = ?
      ORDER BY s.started_at DESC
      LIMIT 30
    `),

    // ✅ ownership check (lecturer can only mark their own sessions)
    lecturerOwnsSession: db.prepare(`
      SELECT 1 AS ok
      FROM sessions s
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id
      WHERE s.id = ? AND c.lecturer_user_id = ?
      LIMIT 1
    `),

    //  list attendance rows for a session (only if lecturer owns it)
    listAttendanceForSessionAsLecturer: db.prepare(`
      SELECT
        st.student_id,
        u.name,
        a.checked_in_at,
        a.status
      FROM attendance a
      JOIN users u ON u.id = a.student_user_id
      JOIN students st ON st.user_id = u.id

      JOIN sessions s ON s.id = a.session_id
      JOIN timetable t ON t.id = s.timetable_id
      JOIN classes c ON c.id = t.class_id

      WHERE a.session_id = ? AND c.lecturer_user_id = ?
      ORDER BY a.checked_in_at ASC
    `),

    // update attendance.status by student_id
    updateAttendanceStatusByStudentId: db.prepare(`
      UPDATE attendance
      SET status = ?
      WHERE session_id = ?
        AND student_user_id = (
          SELECT user_id FROM students WHERE student_id = ?
        )
    `)
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

export function getStudentDashboardSummary(studentUserId) {
  const threshold = getAttendanceThreshold();

  const enrolled = Number(stmt.countStudentEnrollments.get(studentUserId)?.cnt || 0);
  const unread = Number(stmt.countStudentUnreadNotifications.get(studentUserId)?.cnt || 0);
  const total = Number(stmt.countStudentTotalSessions.get(studentUserId)?.cnt || 0);
  const present = Number(stmt.countStudentPresentSessions.get(studentUserId, studentUserId)?.cnt || 0);
  const overallPct = total > 0 ? Math.round((present / total) * 100) : 0;

  const low = Number(
    stmt.countStudentLowAttendanceClasses.get(threshold, studentUserId, studentUserId)?.cnt || 0
  );

  const tiles = [
    { label: "Enrolled classes", value: enrolled },
    { label: "Overall attendance", value: `${overallPct}%`, sub: `${present}/${total} sessions` },
    { label: "Low attendance classes", value: low, sub: `below ${threshold}%` },
    { label: "Unread notifications", value: unread },
  ];

  const notifs = stmt.listStudentRecentNotifications
    .all(studentUserId, 5)
    .map((n) => ({
      type: "notification",
      title: n.title,
      subtitle: n.subjectCode ? `${n.subjectCode} (${n.section || "-"}) • ${n.message}` : n.message,
      time: n.time,
    }));

  const checkins = stmt.listStudentRecentAttendance
    .all(studentUserId, 5)
    .map((a) => ({
      type: "checkin",
      title: `Checked in • ${a.subjectCode} (${a.section})`,
      subtitle: `${a.date} ${a.start_time}-${a.end_time} @ ${a.room} • Status: ${a.status}`,
      time: a.time,
    }));

  const activity = [...notifs, ...checkins].sort((x, y) => String(y.time).localeCompare(String(x.time))).slice(0, 10);

  return { tiles, activity };
}

export function getLecturerDashboardSummary(lecturerUserId) {
  const classes = Number(stmt.countLecturerClasses.get(lecturerUserId)?.cnt || 0);
  const todayTT = Number(stmt.countLecturerTodayTimetables.get(lecturerUserId)?.cnt || 0);
  const active = Number(stmt.countLecturerActiveSessions.get(lecturerUserId)?.cnt || 0);
  const checkinsToday = Number(stmt.countLecturerTodayCheckins.get(lecturerUserId)?.cnt || 0);

  const tiles = [
    { label: "My classes", value: classes },
    { label: "Today's timetables", value: todayTT },
    { label: "Active sessions", value: active },
    { label: "Today's check-ins", value: checkinsToday },
  ];

  const sessions = stmt.listLecturerRecentSessions
    .all(lecturerUserId, 5)
    .map((s) => ({
      type: "session",
      title: `Session ${s.status} • ${s.subjectCode} (${s.section})`,
      subtitle: `${s.date} ${s.start_time}-${s.end_time} @ ${s.room}`,
      time: s.time,
    }));

  const checkins = stmt.listLecturerRecentCheckins
    .all(lecturerUserId, 5)
    .map((c) => ({
      type: "checkin",
      title: `Check-in • ${c.studentId} - ${c.studentName}`,
      subtitle: `${c.subjectCode} (${c.section})`,
      time: c.time,
    }));

  const activity = [...sessions, ...checkins].sort((x, y) => String(y.time).localeCompare(String(x.time)));

  return { tiles, activity };
}

export function getAdminDashboardSummary() {
  const totalUsers = Number(stmt.countUsersAll.get()?.cnt || 0);
  const students = Number(stmt.countUsersByRole.get("STUDENT")?.cnt || 0);
  const lecturers = Number(stmt.countUsersByRole.get("LECTURER")?.cnt || 0);
  const subjects = Number(stmt.countSubjectsAll.get()?.cnt || 0);
  const classes = Number(stmt.countClassesAll.get()?.cnt || 0);
  const activeSessions = Number(stmt.countActiveSessionsAll.get()?.cnt || 0);

  const tiles = [
    { label: "Total users", value: totalUsers },
    { label: "Students", value: students },
    { label: "Lecturers", value: lecturers },
    { label: "Subjects", value: subjects },
    { label: "Classes", value: classes },
    { label: "Active sessions", value: activeSessions },
  ];

  const recentUsers = stmt.listRecentUsers.all(8).map((u) => ({
    type: "user",
    title: `New user • ${u.name} (${u.role})`,
    subtitle: u.email,
    time: u.time,
  }));

  const recentSessions = stmt.listRecentSessionsAll.all(5).map((s) => ({
    type: "session",
    title: `Session ${s.status}`,
    subtitle: `timetable_id: ${s.timetable_id}`,
    time: s.time,
  }));

  const activity = [...recentUsers, ...recentSessions].sort((x, y) => String(y.time).localeCompare(String(x.time)));

  return { tiles, activity };
}

export function getCoordinatorDashboardSummary() {
  const threshold = getAttendanceThreshold();
  const subjects = Number(stmt.countSubjectsAll.get()?.cnt || 0);
  const classes = Number(stmt.countClassesAll.get()?.cnt || 0);

  const lowStudents = Number(stmt.countLowAttendanceStudentsAll.get(threshold)?.cnt || 0);

  const tiles = [
    { label: "Subjects", value: subjects },
    { label: "Classes", value: classes },
    { label: "Low-attendance students", value: lowStudents, sub: `below ${threshold}% in any class` },
  ];

  const cases = stmt.listLowAttendanceCasesAll.all(threshold, 10).map((r) => ({
    type: "low",
    title: `Low attendance • ${r.studentId} - ${r.studentName}`,
    subtitle: `${r.subjectCode} (${r.section}) • ${r.pct}%`,
    time: r.time,
  }));

  return { tiles, activity: cases };
}

export function getLecturerUserIdBySessionId(sessionId) {
  return stmt.getLecturerUserIdBySessionId.get(sessionId)?.lecturerUserId ?? null;
}

export function updateAttendanceStatus(sessionId, studentUserId, status) {
  return stmt.updateAttendanceStatus.run(status, sessionId, studentUserId);
}

export function listStudentScheduleByDate(studentUserId, dateYYYYMMDD) {
  return stmt.listStudentScheduleByDate.all(studentUserId, dateYYYYMMDD);
}

export function listSessionsForLecturer(lecturerUserId) {
  return stmt.listSessionsForLecturer.all(lecturerUserId);
}

export function lecturerOwnsSession(sessionId, lecturerUserId) {
  const row = stmt.lecturerOwnsSession.get(sessionId, lecturerUserId);
  return !!row;
}

export function listAttendanceForSessionAsLecturer(sessionId, lecturerUserId) {
  return stmt.listAttendanceForSessionAsLecturer.all(sessionId, lecturerUserId);
}

export function updateAttendanceStatusByStudentId({ sessionId, studentId, status }) {
  return stmt.updateAttendanceStatusByStudentId.run(status, sessionId, studentId);
}