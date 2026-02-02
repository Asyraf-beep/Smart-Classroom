// src/app/api/notifications/route.js
import { authorize } from "@/lib/auth";
import {
  getAttendanceThreshold,                 // () => number
  listStudentEnrolledClasses,             // (studentUserId) => [{ classId, subjectCode, subjectName, section }]
  countSessionsByClass,                   // (classId) => number
  countPresentByStudentInClass,           // (studentUserId, classId) => number
  notificationExistsToday,                // ({ studentUserId, classId, title, message }) => boolean
  createNotification,                     // ({ studentUserId, classId, title, message }) => void
  listNotificationsForStudent,            // (studentUserId) => rows[]
  markNotificationReadForStudent,         // (studentUserId, notificationId) => void
} from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400, details) {
  return Response.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Create low-attendance warnings (once per day per class)
 */
function maybeCreateLowAttendance(studentUserId) {
  const threshold = getAttendanceThreshold(); // e.g. from settings, default 80
  const classes = listStudentEnrolledClasses(studentUserId);

  for (const c of classes) {
    const totalSessions = countSessionsByClass(c.classId);
    if (!totalSessions) continue;

    const present = countPresentByStudentInClass(studentUserId, c.classId);
    const percent = Math.round((present / totalSessions) * 100);

    if (percent < threshold) {
      const title = "Low attendance warning";
      const message = `Your attendance is ${percent}% for ${c.subjectCode}. Minimum is ${threshold}%.`;

      const exists = notificationExistsToday({
        studentUserId,
        classId: c.classId,
        title,
        message,
      });

      if (!exists) {
        createNotification({
          studentUserId,
          classId: c.classId,
          title,
          message,
        });
      }
    }
  }
}

export async function GET(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  // create warnings (if any)
  maybeCreateLowAttendance(auth.user.id);

  // list notifications
  const rows = listNotificationsForStudent(auth.user.id);

  return Response.json({ notifications: rows });
}

export async function POST(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = Number(body.id);
  if (!id) return jsonError("Missing notification id", 400);

  markNotificationReadForStudent(auth.user.id, id);

  return Response.json({ ok: true });
}