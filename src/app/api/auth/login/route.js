import { getUserByEmail } from "@/lib/db";
import { verifyPassword, signJwt } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const cleanEmail = (email || "").trim().toLowerCase();
    const pw = password || "";

    if (!cleanEmail || !pw) {
      return Response.json({ error: "Missing email or password" }, { status: 400 });
    }

    const user = getUserByEmail(cleanEmail);

    if (!user || !verifyPassword(pw, user.password_hash)) {
      return Response.json({ error: "Invalid login" }, { status: 401 });
    }

    const token = signJwt({ id: user.id, role: user.role, name: user.name });
    return Response.json({ token, role: user.role, name: user.name });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

