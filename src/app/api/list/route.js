import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const sessionId = Number(url.searchParams.get("sessionId") || 0);
  if (!sessionId) return Response.json({ error: "Missing sessionId" }, { status: 400 });

  const rows = db.prepare(`
    SELECT st.student_id, u.name, a.checked_in_at
    FROM attendance a
    JOIN users u ON u.id = a.student_user_id
    JOIN students st ON st.user_id = u.id
    WHERE a.session_id = ?
    ORDER BY a.checked_in_at DESC
  `).all(sessionId);

  return Response.json({ rows });
}
