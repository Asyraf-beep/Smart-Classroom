import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const { classId, studentId } = await req.json();

  const st = db.prepare(`
    SELECT u.id as user_id
    FROM students s JOIN users u ON u.id = s.user_id
    WHERE s.student_id = ?
  `).get(studentId);

  if (!st) return Response.json({ error: "Student not found" }, { status: 404 });

  db.prepare(`
    INSERT OR IGNORE INTO enrollments(class_id, student_user_id)
    VALUES (?, ?)
  `).run(classId, st.user_id);

  return Response.json({ ok: true });
}
