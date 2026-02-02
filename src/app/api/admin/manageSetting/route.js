import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const row = db.prepare("SELECT value FROM settings WHERE key='attendance_threshold'").get();
  return Response.json({ attendance_threshold: row?.value || "80" });
}

export async function POST(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const { attendance_threshold } = await req.json();
  db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES ('attendance_threshold',?)")
    .run(String(attendance_threshold || "80"));

  return Response.json({ ok: true });
}
