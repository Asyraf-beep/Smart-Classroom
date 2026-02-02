import { authorize } from "@/lib/auth";
import { listAvailableClassesForStudent, listMyEnrollments } from "@/lib/db";

export const runtime = "nodejs";

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req) {
  const auth = authorize(req, ["STUDENT"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const available = listAvailableClassesForStudent();
  const mine = listMyEnrollments(auth.user.id);

  return Response.json({ available, mine });
}
