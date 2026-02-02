import { db, initDB } from "../src/lib/db.js";
import bcrypt from "bcryptjs";

db.exec(`PRAGMA foreign_keys = ON;`);

console.log("Seeding...");

// Create sample users
function upsertUser(name, email, password, role) {
  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
  if (existing) return existing.id;
  const info = db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)")
    .run(name, email, hash, role);
  return info.lastInsertRowid;
}

const adminId = upsertUser("Admin", "admin@test.com", "admin123", "ADMIN");
const lecturerId = upsertUser("Lecturer", "lecturer@test.com", "lecturer123", "LECTURER");
const coordId = upsertUser("Coordinator", "coord@test.com", "coord123", "COORDINATOR");

const s1 = upsertUser("Abu", "abu@student.com", "student123", "STUDENT");
db.prepare("INSERT OR IGNORE INTO students(user_id, student_id) VALUES (?,?)").run(s1, "S0001");

const s2 = upsertUser("Ali", "ali@student.com", "student123", "STUDENT");
db.prepare("INSERT OR IGNORE INTO students(user_id, student_id) VALUES (?,?)").run(s2, "S0002");

// Subject
db.prepare("INSERT OR IGNORE INTO subjects(code,name) VALUES (?,?)").run("CS101", "Programming 1");
const subj = db.prepare("SELECT id FROM subjects WHERE code='CS101'").get().id;

// Class
const clsInfo = db.prepare(`
  INSERT INTO classes(subject_id, section, lecturer_user_id)
  VALUES (?,?,?)
`).run(subj, "A", lecturerId);
const classId = clsInfo.lastInsertRowid || db.prepare("SELECT id FROM classes WHERE subject_id=? AND section='A'").get(subj).id;

// Timetable (room lat/lng optional; put some value so geo check can work if you want)
db.prepare(`
  INSERT INTO timetable(class_id,date,start_time,end_time,room,room_lat,room_lng,allowed_radius_m)
  VALUES (?,?,?,?,?,?,?,?)
`).run(classId, "2026-02-01", "10:00", "12:00", "Lab 1", null, null, 80);

const timetableId = db.prepare("SELECT id FROM timetable WHERE class_id=? ORDER BY id DESC LIMIT 1").get(classId).id;

// Enroll
db.prepare("INSERT OR IGNORE INTO enrollments(class_id, student_user_id) VALUES (?,?)").run(classId, s1);
db.prepare("INSERT OR IGNORE INTO enrollments(class_id, student_user_id) VALUES (?,?)").run(classId, s2);

console.log("Seed done!");
console.log("Login accounts:");
console.log("ADMIN: admin@test.com / admin123");
console.log("LECTURER: lecturer@test.com / lecturer123");
console.log("COORD: coord@test.com / coord123");
console.log("STUDENT: abu@student.com / student123  (Student ID S0001 for check-in)");
console.log("Class ID:", classId, "Timetable ID:", timetableId);
