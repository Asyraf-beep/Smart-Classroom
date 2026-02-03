import { authorize } from "@/lib/auth";
import {
  lecturerOwnsSession,
  listAttendanceForSessionAsLecturer,
  updateAttendanceStatusByStudentId,
} from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

const ALLOWED = new Set(["PRESENT", "LATE", "LEAVE_EARLY"]);

export async function GET(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const url = new URL(req.url);
  const sessionId = Number(url.searchParams.get("sessionId") || 0);
  if (!sessionId) return jsonError("Missing sessionId", 400);

  // ownership enforced in query; but if empty, we still want to reject if not owned
  if (!lecturerOwnsSession(sessionId, auth.user.id)) {
    return jsonError("Forbidden (not your session)", 403);
  }

  const rows = listAttendanceForSessionAsLecturer(sessionId, auth.user.id);
  return Response.json({ rows });
}

export async function POST(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const sessionId = Number(body.sessionId || 0);
  const studentId = String(body.studentId || "").trim();
  const status = String(body.status || "").trim().toUpperCase();

  if (!sessionId || !studentId || !ALLOWED.has(status)) {
    return jsonError("Missing/invalid sessionId/studentId/status", 400);
  }

  if (!lecturerOwnsSession(sessionId, auth.user.id)) {
    return jsonError("Forbidden (not your session)", 403);
  }

  const info = updateAttendanceStatusByStudentId({ sessionId, studentId, status });

  if (info.changes === 0) {
    return jsonError("No attendance row found for that student in this session", 404);
  }

  return Response.json({ ok: true });
}
