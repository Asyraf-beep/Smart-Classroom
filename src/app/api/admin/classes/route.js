import { authorize } from "@/lib/auth";
import { createClass, getUserById, listClassesAdmin } from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const classes = listClassesAdmin();
  return Response.json({ classes });
}

export async function POST(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const subjectId = Number(body.subjectId);
  const section = (body.section || "").trim();
  const lecturerUserId = Number(body.lecturerUserId);

  if (!subjectId || !section || !lecturerUserId) {
    return jsonError("Missing subjectId/section/lecturerUserId", 400);
  }

  const lecturer = getUserById(lecturerUserId);
  if (!lecturer || lecturer.role !== "LECTURER") {
    return jsonError("lecturerUserId must be a LECTURER user", 400);
  }

  createClass({ subjectId, section, lecturerUserId });
  return Response.json({ ok: true }, { status: 201 });
}
