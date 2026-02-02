import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR", "LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const rows = db.prepare(`
    SELECT c.id, s.code as subject_code, s.name as subject_name, c.section, c.lecturer_user_id
    FROM classes c JOIN subjects s ON s.id=c.subject_id
    ORDER BY s.code, c.section
  `).all();

  return Response.json({ classes: rows });
}

export async function POST(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const { subject_id, section, lecturer_user_id } = await req.json();
  db.prepare("INSERT INTO classes(subject_id,section,lecturer_user_id) VALUES (?,?,?)")
    .run(subject_id, section, lecturer_user_id);
  return Response.json({ ok: true });
}
