import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const { sessionId } = await req.json();

  db.prepare("UPDATE sessions SET status='ENDED', ended_at=datetime('now') WHERE id=?")
    .run(sessionId);

  return Response.json({ ok: true });
}
