import { authorize } from "@/lib/auth";
import { listSubjects, createSubject, deleteSubjectById } from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const subjects = listSubjects();
  return Response.json({ subjects });
}

export async function POST(req) {
  const auth = authorize(req, ["COORDINATOR"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const code = (body.code || "").trim().toUpperCase();
  const name = (body.name || "").trim();

  if (!code || !name) return jsonError("Missing code/name", 400);

  try {
    createSubject(code, name);
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("UNIQUE constraint failed: subjects.code")) {
      return jsonError("Subject code already exists", 409);
    }
    return jsonError("Create subject failed", 500);
  }
}

export async function DELETE(req) {
  const auth = authorize(req, ["COORDINATOR"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = Number(body.id);
  if (!id) return jsonError("Invalid id", 400);

  deleteSubjectById(id);
  return Response.json({ ok: true });
}

