import {
  withTx,
  getUserByEmail,
  insertUser,
  insertStudent,
  listUsers,
  updateUserRole,
  deleteUserById,
} from "@/lib/db";
import { authorize, hashPassword } from "@/lib/auth";
import { allocateStudentId } from "@/lib/generateStudentId";

export const runtime = "nodejs";

function cleanEmail(email) {
  return (email || "").trim().toLowerCase();
}

function jsonError(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const url = new URL(req.url);
  const role = url.searchParams.get("role"); // optional

  const allowed = new Set(["STUDENT", "LECTURER", "ADMIN", "COORDINATOR"]);
  const roleFilter = role && allowed.has(role) ? role : null;

  const users = listUsers(roleFilter);
  return Response.json({ users });
}

export async function POST(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const name = (body.name || "").trim();
  const email = cleanEmail(body.email);
  const password = body.password || "";
  const role = (body.role || "").trim().toUpperCase();

  const allowedRoles = new Set(["STUDENT", "LECTURER", "ADMIN", "COORDINATOR"]);
  if (!name || !email || !password || !allowedRoles.has(role)) {
    return jsonError("Missing/invalid name/email/password/role", 400);
  }

  const existing = getUserByEmail(email);
  if (existing) return jsonError("Email already exists", 409);

  const passwordHash = hashPassword(password);

  const result = withTx(() => {
    const info = insertUser({ name, email, passwordHash, role });
    const userId = Number(info.lastInsertRowid);

    let studentId = null;
    if (role === "STUDENT") {
      studentId = allocateStudentId();
      insertStudent({ userId, studentId });
    }

    return { userId, studentId };
  });

  return Response.json({ ok: true, ...result }, { status: 201 });
}

export async function PATCH(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = Number(body.id);
  const role = (body.role || "").trim().toUpperCase();
  const allowedRoles = new Set(["STUDENT", "LECTURER", "ADMIN", "COORDINATOR"]);

  if (!id || !allowedRoles.has(role)) return jsonError("Invalid id/role", 400);

  updateUserRole(id, role);
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const auth = authorize(req, ["ADMIN"]);
  if (!auth.ok) return jsonError(auth.message, auth.status);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid JSON body", 400);

  const id = Number(body.id);
  if (!id) return jsonError("Invalid id", 400);

  deleteUserById(id);
  return Response.json({ ok: true });
}
