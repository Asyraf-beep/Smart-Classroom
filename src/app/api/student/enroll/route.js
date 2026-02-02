import { authorize } from "@/lib/auth";
import {
  isEnrolledInClass,
  isEnrolledInSameSubject,
  enrollStudentInClass,
  unenrollStudentFromClass,
} from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const classId = Number(body.classId);
  if (!classId) return jsonError("Invalid classId", 400);

  // already enrolled in this exact class
  if (isEnrolledInClass(classId, auth.user.id)) {
    return jsonError("Already enrolled in this class", 409);
  }

  // optional: only ONE section per subject
  if (isEnrolledInSameSubject(auth.user.id, classId)) {
    return jsonError("Already enrolled in another section for this subject", 409);
  }

  enrollStudentInClass(auth.user.id, classId);
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const classId = Number(body.classId);
  if (!classId) return jsonError("Invalid classId", 400);

  unenrollStudentFromClass(auth.user.id, classId);
  return Response.json({ ok: true });
}
