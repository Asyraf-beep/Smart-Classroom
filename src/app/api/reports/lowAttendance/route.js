import { authorize } from "@/lib/auth";
import { getAttendanceReportByClass, getAttendanceThreshold } from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const url = new URL(req.url);
  const classId = Number(url.searchParams.get("classId"));
  if (!classId) return jsonError("classId is required", 400);

  const threshold = getAttendanceThreshold();
  const baseRows = getAttendanceReportByClass(classId);

  const rows = baseRows
    .map((r) => ({
      student_id: r.student_id || "—",
      name: r.name,
      percent: Number(r.percent || 0),
      status: Number(r.percent || 0) < threshold ? "LOW" : "OK",
    }))
    .filter((r) => r.percent < threshold);

  return Response.json({ rows, threshold });
}
