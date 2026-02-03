// src/lib/overviewAttendance.js
import { db } from "@/lib/db";

export function getStudentOverview(userId) {
  const student = db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        s.student_id AS studentId
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.id = ?
      `
    )
    .get(userId);

  if (!student) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }

  // Enrolled classes
  const classes = db.prepare(
      `
      SELECT
        c.id AS classId,
        sub.code AS subjectCode,
        sub.name AS subjectName,
        c.section AS section,
        lec.name AS lecturerName,
        lec.email AS lecturerEmail
      FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      JOIN subjects sub ON sub.id = c.subject_id
      LEFT JOIN users lec ON lec.id = c.lecturer_user_id
      WHERE e.student_user_id = ?
      ORDER BY sub.code, c.section
      `
    )
    .all(userId);

  // Attendance % per subject (based on ACTUAL sessions conducted)
  // total = number of sessions for enrolled classes
  // attended = number of attendance records for those sessions
  const bySubject = db.prepare(
      `
      SELECT
        sub.id AS subjectId,
        sub.code AS code,
        sub.name AS name,
        COUNT(DISTINCT ses.id) AS total,
        COUNT(DISTINCT a.session_id) AS attended
      FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      JOIN subjects sub ON sub.id = c.subject_id
      LEFT JOIN timetable tt ON tt.class_id = c.id
      LEFT JOIN sessions ses ON ses.timetable_id = tt.id
      LEFT JOIN attendance a
        ON a.session_id = ses.id
       AND a.student_user_id = e.student_user_id
      WHERE e.student_user_id = ?
      GROUP BY sub.id
      ORDER BY sub.code
      `
    ).all(userId).map((r) => {
      const total = Number(r.total || 0);
      const attended = Number(r.attended || 0);
      const percentage = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0; // 1 decimal
      return { ...r, total, attended, percentage };
    });

  // Overall
  const totalAll = bySubject.reduce((s, x) => s + x.total, 0);
  const attendedAll = bySubject.reduce((s, x) => s + x.attended, 0);
  const overallPct = totalAll > 0 ? Math.round((attendedAll / totalAll) * 1000) / 10 : 0;

  return {
    attendance: {
      overall: { attended: attendedAll, total: totalAll, percentage: overallPct },
      bySubject,
    },
  };
}
