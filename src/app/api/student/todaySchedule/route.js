import { authorize } from "@/lib/auth";
import { listStudentScheduleByDate } from "@/lib/db";

export const runtime = "nodejs";

// Get YYYY-MM-DD in Malaysia time (Asia/Kuala_Lumpur)
function todayMY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

export async function GET(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayMY(); // allow testing with ?date=YYYY-MM-DD

  const rows = listStudentScheduleByDate(auth.user.id, date);

  return Response.json({
    date,
    rows,
  });
}
