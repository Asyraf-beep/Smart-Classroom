import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function POST(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const { timetableId, roomLat, roomLng, roomAccuracyM, tolerance } = await req.json();

  const tt = db.prepare(`
    SELECT t.*, c.lecturer_user_id
    FROM timetable t
    JOIN classes c ON c.id = t.class_id
    WHERE t.id = ?
  `).get(timetableId);

  if (!tt || tt.lecturer_user_id !== auth.user.id) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const existing = db.prepare(`
    SELECT id, status
    FROM sessions
    WHERE timetable_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(timetableId);

  let sessionId;

  if (existing?.id) {
    sessionId = existing.id;

    // if it was ended, reopen it
    if (existing.status === "ENDED") {
      db.prepare(`
        UPDATE sessions
        SET status = 'ACTIVE',
            started_at = datetime('now'),
            ended_at = NULL
        WHERE id = ?
      `).run(sessionId);
    }

    db.prepare(`
      UPDATE sessions
      SET room_lat = ?,
          room_lng = ?,
          room_accuracy_m = ?,
          tolerance = COALESCE(?, tolerance)
      WHERE id = ?
    `).run(
      roomLat ?? null,
      roomLng ?? null,
      roomAccuracyM ?? null,
      tolerance ?? null,
      sessionId
    );
  } else {
    const info = db.prepare(`
      INSERT INTO sessions(timetable_id, status, room_lat, room_lng, room_accuracy_m, tolerance)
      VALUES (?, 'ACTIVE', ?, ?, ?, ?)
    `).run(
      timetableId,
      roomLat ?? null,
      roomLng ?? null,
      roomAccuracyM ?? null,
      Number(tolerance || 80)
    );

    sessionId = info.lastInsertRowid;
  }

  // short-lived token (you can refresh QR without creating new session)
  const token = jwt.sign({ sessionId }, process.env.JWT_SECRET, { expiresIn: "10m" });
  const link = `${process.env.BASE_URL}/checkin?token=${encodeURIComponent(token)}`;

  const qrDataUrl = await QRCode.toDataURL(link);
  return Response.json({ sessionId, link, qrDataUrl });
}
