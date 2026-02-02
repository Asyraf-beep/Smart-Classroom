import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const rows = db.prepare("SELECT id, code, name FROM subjects ORDER BY code").all();
  return Response.json({ subjects: rows });
}

export async function POST(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const { code, name } = await req.json();
  if (!code || !name) return Response.json({ error: "Missing fields" }, { status: 400 });

  const exists = db.prepare("SELECT 1 FROM subjects WHERE code=?").get(code);
  if (exists) return Response.json({ error: "Duplicate subject" }, { status: 409 });

  db.prepare("INSERT INTO subjects(code,name) VALUES (?,?)").run(code, name);
  return Response.json({ ok: true });
}
