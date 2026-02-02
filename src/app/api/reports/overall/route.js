import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

function getThreshold() {
  const row = db.prepare("SELECT value FROM settings WHERE key='attendance_threshold'").get();
  return Number(row?.value || 80);
}

export async function GET(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const classId = Number(url.searchParams.get("classId") || 0);
  if (!classId) return Response.json({ error: "Missing classId" }, { status: 400 });

  const threshold = getThreshold();

  const totalSessions = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM sessions s JOIN timetable t ON t.id=s.timetable_id
    WHERE t.class_id = ?
  `).get(classId).cnt;

  const students = db.prepare(`
    SELECT u.id as user_id, u.name, st.student_id
    FROM enrollments e
    JOIN users u ON u.id=e.student_user_id
    JOIN students st ON st.user_id=u.id
    WHERE e.class_id = ?
    ORDER BY st.student_id
  `).all(classId);

  const rows = students.map((s) => {
    const present = db.prepare(`
      SELECT COUNT(*) as cnt
      FROM attendance a
      JOIN sessions se ON se.id=a.session_id
      JOIN timetable t ON t.id=se.timetable_id
      WHERE a.student_user_id = ? AND t.class_id = ?
    `).get(s.user_id, classId).cnt;

    const percent = totalSessions === 0 ? 0 : Math.round((present / totalSessions) * 100);
    return {
      student_id: s.student_id,
      name: s.name,
      percent,
      status: percent < threshold ? "LOW" : "OK",
    };
  });

  return Response.json({ rows, totalSessions, threshold });
}
