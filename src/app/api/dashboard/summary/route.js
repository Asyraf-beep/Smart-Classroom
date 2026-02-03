import { authorize } from "@/lib/auth";
import {
  getStudentDashboardSummary,
  getLecturerDashboardSummary,
  getAdminDashboardSummary,
  getCoordinatorDashboardSummary,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["STUDENT", "LECTURER", "ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const role = auth.user.role;

  let summary;
  if (role === "STUDENT") summary = getStudentDashboardSummary(auth.user.id);
  else if (role === "LECTURER") summary = getLecturerDashboardSummary(auth.user.id);
  else if (role === "ADMIN") summary = getAdminDashboardSummary();
  else summary = getCoordinatorDashboardSummary();

  return Response.json(summary);
}
