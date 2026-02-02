import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { distanceMeters } from "@/lib/geo";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { token, studentId, password, lat, lng, accuracy } = await req.json();

    // 1) verify QR token -> sessionId
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return Response.json({ error: "Invalid/expired QR token" }, { status: 401 });
    }

    const sessionId = decoded.sessionId;

    const room = db
      .prepare(
        `
        SELECT
          status,
          room_lat AS roomLat,
          room_lng AS roomLng,
          room_accuracy_m AS roomAccuracyM,
          tolerance AS tolerance
        FROM sessions
        WHERE id = ?
        `
      )
      .get(sessionId);

    if (!room) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // optional: block if session ended
    if (room.status !== "ACTIVE") {
      return Response.json({ error: "Session is not active" }, { status: 403 });
    }

    // 3) distance check (only if session has coords)
    const hasRoomCoords = room.roomLat != null && room.roomLng != null;
    const hasClientCoords = lat != null && lng != null;

    let dist = null;

    if (hasRoomCoords) {
      // strict: if room coords exist, student coords must exist
      if (!hasClientCoords) {
        return Response.json({ error: "Location required" }, { status: 403 });
      }

      // uses lib/geo.js to calculate range in meter
      dist = distanceMeters(
        Number(lat),
        Number(lng),
        Number(room.roomLat),
        Number(room.roomLng)
      );

      const radius = Number(room.tolerance || 80);
      if (dist == null || dist > radius) {
        return Response.json(
          { error: `Out of range (${Math.round(dist || 0)}m > ${radius}m)` },
          { status: 403 }
        );
      }
    }

    // 4) verify student credentials by studentId
    const studentUser = db
      .prepare(
        `
        SELECT u.id, u.password_hash
        FROM users u
        JOIN students s ON s.user_id = u.id
        WHERE s.student_id = ?
        `
      )
      .get(studentId);

    if (!studentUser || !verifyPassword(password, studentUser.password_hash)) {
      return Response.json(
        { error: "Invalid student ID or password" },
        { status: 401 }
      );
    }

    // 5) insert attendance (location NOT stored)
    db.prepare(
      `
      INSERT OR IGNORE INTO attendance(session_id, student_user_id, status)
      VALUES (?, ?, 'PRESENT')
      `
    ).run(sessionId, studentUser.id);

    return Response.json({
      ok: true,
      sessionId,
      distanceMeters: dist,
      accuracy,
      roomAccuracyM: room.roomAccuracyM ?? null,
      tolerance: room.tolerance ?? 80,
    });
  } catch (e) {
    console.error("attendance submit error:", e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

