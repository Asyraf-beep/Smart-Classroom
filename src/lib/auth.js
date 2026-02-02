// lib/auth.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
}

export function verifyJwt(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function getBearerToken(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function authorize(req, allowedRoles) {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, message: "Not logged in" };

  const user = verifyJwt(token);
  if (!user) return { ok: false, status: 401, message: "Invalid token" };

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return { ok: true, user };
}
