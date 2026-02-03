// seed.mjs (run with: node seed.mjs)
import Database from "better-sqlite3";
import { hashPassword } from "../src/lib/auth.js";

const dbPath = process.env.DB_PATH || "./SmartClassroom.db";
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

// ---------- helpers ----------
function pad2(n) {
  return String(n).padStart(2, "0");
}
function slugify(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}
function datePlus(baseDate, addDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + addDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// deterministic RNG (same data each time)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260203);

function pickUnique(arr, k) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < k && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ---------- ensure settings ----------
db.exec(`
  PRAGMA foreign_keys = ON;
  INSERT OR IGNORE INTO settings(key, value) VALUES ('attendance_threshold', '80');
  INSERT OR IGNORE INTO settings(key, value) VALUES ('student_id_counter', '1000');
`);

// ---------- prepared statements ----------
const stmt = {
  wipeAttendance: db.prepare(`DELETE FROM attendance`),
  wipeSessions: db.prepare(`DELETE FROM sessions`),
  wipeEnrollments: db.prepare(`DELETE FROM enrollments`),
  wipeTimetable: db.prepare(`DELETE FROM timetable`),
  wipeClasses: db.prepare(`DELETE FROM classes`),
  wipeSubjects: db.prepare(`DELETE FROM subjects`),
  wipeStudents: db.prepare(`DELETE FROM students`),
  wipeNotifications: db.prepare(`DELETE FROM notifications`),
  wipeUsers: db.prepare(`DELETE FROM users`),

  upsertSetting: db.prepare(`
    INSERT INTO settings(key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `),

  insertUser: db.prepare(`
    INSERT INTO users(name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `),
  insertStudent: db.prepare(`
    INSERT INTO students(user_id, student_id)
    VALUES (?, ?)
  `),
  insertSubject: db.prepare(`
    INSERT INTO subjects(code, name)
    VALUES (?, ?)
  `),
  insertClass: db.prepare(`
    INSERT INTO classes(subject_id, section, lecturer_user_id)
    VALUES (?, ?, ?)
  `),
  insertTimetable: db.prepare(`
    INSERT INTO timetable(class_id, date, start_time, end_time, room, room_lat, room_lng, allowed_radius_m)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  insertEnrollment: db.prepare(`
    INSERT OR IGNORE INTO enrollments(class_id, student_user_id)
    VALUES (?, ?)
  `),

  // bonus: make reports non-empty
  insertSessionEnded: db.prepare(`
    INSERT INTO sessions(timetable_id, status, ended_at, tolerance)
    VALUES (?, 'ENDED', datetime('now'), 40)
  `),
  listEnrolledStudentsByClass: db.prepare(`
    SELECT student_user_id
    FROM enrollments
    WHERE class_id = ?
  `),
  insertAttendance: db.prepare(`
    INSERT OR IGNORE INTO attendance(session_id, student_user_id, status)
    VALUES (?, ?, ?)
  `),
};

// ---------- named people ----------
const coordinators = [
  "Nur Aina",         // COORDINATOR 1
  "Amir Hakim",       // COORDINATOR 2
  "Priya Nair",       // COORDINATOR 3
];

const lecturers = [
  "Dr. Farid Hassan",
  "Ms. Siti Aisyah",
  "Mr. Daniel Tan",
  "Dr. Kavitha Raman",
  "Mr. John Lim",
  "Ms. Nur Izzati",
  "Mr. Hafiz Rahman",
  "Dr. Mei Ling",
  "Mr. Arjun Kumar",
  "Ms. Sarah Lee",
];

const students = [
  "Ali", "Abu", "Ahmad", "Aiman", "Aisyah", "Alya", "Amir", "Anis", "Asyraf", "Aqil",
  "Benjamin", "Catherine", "Chong Wei", "Daniel", "Diana", "Ethan", "Farah", "Fatin", "Hakim", "Haziq",
  "Irfan", "Ismail", "Jasmine", "John Doe", "Kumar", "Lim Wei Jie", "Mei Xin", "Muhammad", "Nurul", "Suresh",
];

// ---------- seed ----------
const seed = db.transaction(() => {
  // wipe (FK safe order)
  stmt.wipeAttendance.run();
  stmt.wipeSessions.run();
  stmt.wipeEnrollments.run();
  stmt.wipeTimetable.run();
  stmt.wipeClasses.run();
  stmt.wipeSubjects.run();
  stmt.wipeStudents.run();
  stmt.wipeNotifications.run();
  stmt.wipeUsers.run();

  // reset settings
  stmt.upsertSetting.run("student_id_counter", "1000");
  stmt.upsertSetting.run("attendance_threshold", "80");

  const defaultPass = "abc123";
  const passHash = hashPassword(defaultPass);

  // coordinators (3)
  const coordinatorIds = [];
  coordinators.forEach((name, i) => {
    const email = `${slugify(name)}@test.com`;
    const info = stmt.insertUser.run(name, email, passHash, "COORDINATOR");
    coordinatorIds.push(Number(info.lastInsertRowid));
  });

  // lecturers (10)

  const lecturerIds = [];
  lecturers.forEach((name, i) => {
    const email = `${slugify(name)}@test.com`;
    const info = stmt.insertUser.run(name, email, passHash, "LECTURER");
    lecturerIds.push(Number(info.lastInsertRowid));
  });

  // students (30) + student_id
  const studentUserIds = [];
  let counter = 1000;

  students.forEach((name, i) => {
    const email = `${slugify(name)}@test.com`;
    const userInfo = stmt.insertUser.run(name, email, passHash, "STUDENT");
    const userId = Number(userInfo.lastInsertRowid);

    counter += 1;
    const studentId = `S${String(counter).padStart(4, "0")}`;
    stmt.insertStudent.run(userId, studentId);

    studentUserIds.push(userId);
  });

  stmt.upsertSetting.run("student_id_counter", String(counter));

  // subjects (5)
  const subjects = [
    { code: "CS101", name: "Programming Fundamentals" },
    { code: "CS102", name: "Database Systems" },
    { code: "CS103", name: "Computer Networks" },
    { code: "CS104", name: "Operating Systems" },
    { code: "CS105", name: "Software Engineering" },
  ];

  const subjectIds = subjects.map((s) => {
    const info = stmt.insertSubject.run(s.code, s.name);
    return { ...s, id: Number(info.lastInsertRowid) };
  });

  // each subject -> 2 classes (A/B), one lecturer per class
  const classIds = []; // { id, subjectCode, section, lecturerUserId }
  let lecIdx = 0;

  for (const subj of subjectIds) {
    for (const section of ["A", "B"]) {
      const lecturerUserId = lecturerIds[lecIdx % lecturerIds.length];
      lecIdx++;

      const info = stmt.insertClass.run(subj.id, section, lecturerUserId);
      classIds.push({
        id: Number(info.lastInsertRowid),
        subjectCode: subj.code,
        section,
        lecturerUserId,
      });
    }
  }

  // each class -> 2 timetables
  const base = new Date("2026-02-03T00:00:00");
  const timetableIds = [];
  let dayOffset = 1;

  for (const c of classIds) {
    const room1 = `Lab ${1 + Math.floor(rng() * 5)}`;
    const room2 = `Room ${100 + Math.floor(rng() * 50)}`;

    const d1 = datePlus(base, dayOffset++);
    const d2 = datePlus(base, dayOffset + 6);

    const t1 = stmt.insertTimetable.run(
      c.id,
      d1,
      "10:00",
      "12:00",
      room1,
      3.120 + rng() * 0.01,
      101.650 + rng() * 0.01,
      80
    );
    timetableIds.push({ id: Number(t1.lastInsertRowid), classId: c.id });

    const t2 = stmt.insertTimetable.run(
      c.id,
      d2,
      "14:00",
      "16:00",
      room2,
      3.120 + rng() * 0.01,
      101.650 + rng() * 0.01,
      80
    );
    timetableIds.push({ id: Number(t2.lastInsertRowid), classId: c.id });

    dayOffset++;
  }

  // enrollments: each student enrolls in 3 random classes
  for (const studentUserId of studentUserIds) {
    const pickedClassIds = pickUnique(classIds.map((c) => c.id), 3);
    for (const classId of pickedClassIds) {
      stmt.insertEnrollment.run(classId, studentUserId);
    }
  }

  // bonus: ended sessions + attendance so overview/reports have data
  for (const tt of timetableIds) {
    const sessionInfo = stmt.insertSessionEnded.run(tt.id);
    const sessionId = Number(sessionInfo.lastInsertRowid);

    const enrolled = stmt.listEnrolledStudentsByClass
      .all(tt.classId)
      .map((r) => r.student_user_id);

    const checkInCount = Math.max(1, Math.floor(enrolled.length * 0.7));
    const presentStudents = pickUnique(enrolled, checkInCount);

    for (const suid of presentStudents) {
      const roll = rng();
      const status = roll < 0.1 ? "LATE" : roll < 0.15 ? "LEAVE_EARLY" : "PRESENT";
      stmt.insertAttendance.run(sessionId, suid, status);
    }
  }

  return {
    coordinators: coordinatorIds.length,
    lecturers: lecturerIds.length,
    students: studentUserIds.length,
    subjects: subjectIds.length,
    classes: classIds.length,
    timetables: timetableIds.length,
  };
});

const result = seed();
console.log("✅ Seed completed:", result);
console.log("🔐 Password for all seeded users:", "abc123");
console.log("📦 DB:", dbPath);
