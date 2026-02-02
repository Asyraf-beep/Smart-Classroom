// src/app/api/auth/register/route.js
import { db, getUserByEmail, insertUser, insertStudent, ensureSetting, getSetting, setSetting } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { allocateStudentId } from "@/lib/generateStudentId";

export const runtime = "nodejs";

function jsonError(message, status = 400, details) {
  return Response.json({ error: message, ...(details ? { details } : {}) }, { status });
}

function createStudentAccount({ name, email, passwordHash }) {
  return db.transaction(() => {
    const existing = getUserByEmail(email);
    if (existing) {
      const e = new Error("Email already registered");
      e.code = "DUP_EMAIL";
      throw e;
    }

    const studentId = allocateStudentId();

    const userInfo = insertUser({
      name,
      email,
      passwordHash,
      role: "STUDENT",
    });

    const userId = Number(userInfo.lastInsertRowid);

    insertStudent({ userId, studentId });

    return { userId, studentId };
  })();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Invalid JSON body", 400);

    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!name || !email || !password) {
      return jsonError("Missing name/email/password", 400);
    }

    const passwordHash = hashPassword(password);

    const result = createStudentAccount({ name, email, passwordHash });

    return Response.json({ ok: true, studentId: result.studentId }, { status: 201 });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    if (err?.code === "DUP_EMAIL") return jsonError(err.message, 409);

    const msg = String(err?.message || err);
    if (msg.includes("UNIQUE constraint failed: users.email")) {
      return jsonError("Email already registered", 409);
    }
    if (msg.includes("UNIQUE constraint failed: students.student_id")) {
      return jsonError("Student ID collision, try again", 500);
    }

    return jsonError("Register failed", 500, msg);
  }
}


