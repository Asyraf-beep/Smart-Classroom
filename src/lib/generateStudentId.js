// src/lib/generateStudentId.js
import { ensureSetting, getSetting, setSetting } from "@/lib/db";


export function allocateStudentId() {
  ensureSetting("student_id_counter", "1000");

  const current = Number(getSetting("student_id_counter") || 1000);
  const next = current + 1;

  setSetting("student_id_counter", String(next));

  return `S${String(next).padStart(4, "0")}`;
}
