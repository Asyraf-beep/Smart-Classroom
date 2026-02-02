import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const rows = db.prepare(`
    SELECT a.checked_in_at,
           subj.code as subject_code, c.section, t.date, t.start_time, t.end_time, t.room
    FROM attendance a
    JOIN sessions s ON s.id=a.session_id
    JOIN timetable t ON t.id=s.timetable_id
    JOIN classes c ON c.id=t.class_id
    JOIN subjects subj ON subj.id=c.subject_id
    WHERE a.student_user_id = ?
    ORDER BY a.checked_in_at DESC
  `).all(auth.user.id);

  return Response.json({ history: rows });
}
