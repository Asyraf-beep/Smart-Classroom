import { authorize } from "@/lib/auth";
import { buildReportPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "overall";
  const classId = url.searchParams.get("classId");

  // call internal APIs via fetch is annoying on server; keep it simple:
  // just redirect user to JSON route if missing classId
  if (!classId) {
    return Response.json({ error: "Missing classId" }, { status: 400 });
  }

  // Build rows by calling the same report routes using absolute fetch is possible,
  // but easier: client already loaded JSON and could do PDF client-side.
  // For assignment, we do server-side by fetching JSON from same origin:
  const base = `${url.protocol}//${url.host}`;
  const jsonUrl = type === "low"
    ? `${base}/api/reports/lowAttendance?classId=${classId}`
    : `${base}/api/reports/overall?classId=${classId}`;

  const token = req.headers.get("authorization") || "";
  const res = await fetch(jsonUrl, { headers: { authorization: token } });
  const data = await res.json();
  const rows = data.rows || [];

  const title = type === "low" ? "Low Attendance Report" : "Overall Attendance Report";
  const pdfBuffer = await buildReportPdf(title, rows);

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${type}-report.pdf"`,
    },
  });
}
