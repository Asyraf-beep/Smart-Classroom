import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";

export const runtime = "nodejs";

function lecturerOwnsSession(sessionId, lecturerUserId) {
  const row = db.prepare(`
    SELECT c.lecturer_user_id AS lecturerUserId
    FROM sessions s
    JOIN timetable tt ON tt.id = s.timetable_id
    JOIN classes c ON c.id = tt.class_id
    WHERE s.id = ?
  `).get(sessionId);

  return row && Number(row.lecturerUserId) === Number(lecturerUserId);
}

/**
 * GET
 * Lecturer fetches attendance list
 */
export async function GET(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const sessionId = Number(url.searchParams.get("sessionId") || 0);
  if (!sessionId) return Response.json({ error: "Missing sessionId" }, { status: 400 });

  // ✅ Security: only session owner lecturer can view
  if (!lecturerOwnsSession(sessionId, auth.user.id)) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const rows = db.prepare(`
    SELECT
      a.student_user_id,
      st.student_id,
      u.name,
      a.checked_in_at,
      a.status
    FROM attendance a
    JOIN users u ON u.id = a.student_user_id
    JOIN students st ON st.user_id = u.id
    WHERE a.session_id = ?
    ORDER BY a.checked_in_at ASC
  `).all(sessionId);

  return Response.json({ rows });
}

/**
 * POST
 * Lecturer marks student status: PRESENT / LATE / LEFT_EARLY
 */
export async function POST(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const sessionId = Number(body.sessionId || 0);

  // You can accept either studentUserId (recommended) OR studentId (string)
  const studentUserId = body.studentUserId != null ? Number(body.studentUserId) : null;
  const studentId = body.studentId ? String(body.studentId).trim() : null;

  const status = String(body.status || "").trim().toUpperCase();

  if (!sessionId) return Response.json({ error: "Missing sessionId" }, { status: 400 });
  if (!studentUserId && !studentId) {
    return Response.json({ error: "Missing studentUserId or studentId" }, { status: 400 });
  }

  const allowed = new Set(["PRESENT", "LATE", "LEFT_EARLY"]);
  if (!allowed.has(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  // ✅ Security: only session owner lecturer can update
  if (!lecturerOwnsSession(sessionId, auth.user.id)) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  let info;

  if (studentUserId) {
    info = db.prepare(`
      UPDATE attendance
      SET status = ?
      WHERE session_id = ? AND student_user_id = ?
    `).run(status, sessionId, studentUserId);
  } else {
    // update via student_id string
    info = db.prepare(`
      UPDATE attendance
      SET status = ?
      WHERE session_id = ?
        AND student_user_id = (SELECT user_id FROM students WHERE student_id = ?)
    `).run(status, sessionId, studentId);
  }

  if (!info.changes) {
    return Response.json(
      { error: "Attendance row not found (student not checked-in yet?)" },
      { status: 404 }
    );
  }

  return Response.json({ ok: true });
}
