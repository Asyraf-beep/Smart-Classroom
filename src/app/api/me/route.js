// src/app/api/me/route.js
import { authorize } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req) {
  const auth = authorize(req, ["STUDENT", "LECTURER", "ADMIN", "COORDINATOR"]);
  if (!auth.ok) return Response.json({ error: auth.message }, { status: auth.status });

  const user = getUserById(auth.user.id);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json({ user });
}

