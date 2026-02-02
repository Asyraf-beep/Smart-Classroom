import { authorize } from "@/lib/auth";
import { getStudentOverview } from "@/lib/overviewAttendance";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) {
    return Response.json({ error: auth.message }, { status: auth.status });
  }

  const data = getStudentOverview(auth.user.id);
  return Response.json(data);
}
