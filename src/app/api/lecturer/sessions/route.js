import { authorize } from "@/lib/auth";
import { listSessionsForLecturer } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["LECTURER"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const rows = listSessionsForLecturer(auth.user.id);
  return Response.json({ rows });
}
