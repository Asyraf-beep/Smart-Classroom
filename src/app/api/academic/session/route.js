import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["LECTURER", "ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const mine = url.searchParams.get("mine") === "1";

  const rows = mine
    ? db.prepare(`
        SELECT t.id, t.date, t.start_time, t.end_time, t.room,
               t.allowed_radius_m,
               s.code as subject_code, c.section
        FROM timetable t
        JOIN classes c ON c.id=t.class_id
        JOIN subjects s ON s.id=c.subject_id
        WHERE c.lecturer_user_id = ?
        ORDER BY t.date DESC
      `).all(auth.user.id)
    : db.prepare(`
        SELECT t.id, t.date, t.start_time, t.end_time, t.room,
               t.allowed_radius_m,
               s.code as subject_code, c.section
        FROM timetable t
        JOIN classes c ON c.id=t.class_id
        JOIN subjects s ON s.id=c.subject_id
        ORDER BY t.date DESC
      `).all();

  return Response.json({ timetables: rows });
}
