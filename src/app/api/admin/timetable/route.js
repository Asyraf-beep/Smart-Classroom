import { authorize } from "@/lib/auth";
import {
  createTimetable,
  deleteTimetableById,
  listTimetableByClass,
} from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const url = new URL(req.url);
  const classId = Number(url.searchParams.get("classId"));

  if (!classId) return jsonError("classId is required", 400);

  const rows = listTimetableByClass(classId);
  return Response.json({ rows });
}

export async function POST(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const classId = Number(body.classId);
  const date = (body.date || "").trim();
  const start_time = (body.start_time || "").trim();
  const end_time = (body.end_time || "").trim();
  const room = (body.room || "").trim();

  if (!classId || !date || !start_time || !end_time || !room) {
    return jsonError("Missing classId/date/start_time/end_time/room", 400);
  }

  createTimetable({ classId, date, start_time, end_time, room });
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = Number(body.id);
  if (!id) return jsonError("Invalid id", 400);

  deleteTimetableById(id);
  return Response.json({ ok: true });
}
