"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MessageBox from "@/components/MessageBox";
import { apiFetch } from "@/lib/client";

function StatusBadge({ status }) {
  const base = "inline-flex rounded-full px-2 py-1 text-xs font-semibold border";
  if (status === "LATE") return <span className={`${base} border-amber-200 bg-amber-50 text-amber-800`}>LATE</span>;
  if (status === "LEAVE_EARLY")
    return <span className={`${base} border-purple-200 bg-purple-50 text-purple-800`}>LEAVE EARLY</span>;
  return <span className={`${base} border-green-200 bg-green-50 text-green-800`}>PRESENT</span>;
}

function MarkAttendanceContent() {
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadSessions() {
    setMsg("");
    try {
      const data = await apiFetch("/api/lecturer/sessions");
      setSessions(data.rows || []);
      // auto select latest session
      if ((data.rows || []).length > 0 && !sessionId) {
        setSessionId(String(data.rows[0].sessionId));
      }
    } catch (e) {
      setMsg(e.message || "Failed to load sessions");
    }
  }

  async function loadAttendance(sid) {
    if (!sid) return;
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/api/attendance/markStatus?sessionId=${encodeURIComponent(sid)}`);
      setRows(data.rows || []);
    } catch (e) {
      setMsg(e.message || "Failed to load attendance list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    loadAttendance(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function setStatus(studentId, status) {
    setMsg("");
    try {
      await apiFetch("/api/attendance/markStatus", {
        method: "POST",
        body: { sessionId: Number(sessionId), studentId, status },
      });
      await loadAttendance(sessionId);
    } catch (e) {
      setMsg(e.message || "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      {msg && <MessageBox type="error">{msg}</MessageBox>}

      {/* Session selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Select Session</div>

        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">-- select --</option>
          {sessions.map((s) => (
            <option key={s.sessionId} value={s.sessionId}>
              #{s.sessionId} • {s.subjectCode} ({s.section}) • {s.date} {s.start_time}-{s.end_time} @ {s.room} • {s.sessionStatus}
            </option>
          ))}
        </select>

        <button
          onClick={loadSessions}
          className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          Refresh sessions
        </button>
      </div>

      {/* Attendance table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Attendance (Mark Late / Leave Early)</div>

        {loading ? (
          <div className="mt-3">
            <MessageBox>Loading attendance...</MessageBox>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-3">
            <MessageBox>No check-ins yet for this session.</MessageBox>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 p-3 text-left">Student ID</th>
                  <th className="border-b border-slate-200 p-3 text-left">Name</th>
                  <th className="border-b border-slate-200 p-3 text-left">Check-in Time</th>
                  <th className="border-b border-slate-200 p-3 text-left">Status</th>
                  <th className="border-b border-slate-200 p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student_id} className="text-slate-900">
                    <td className="border-b border-slate-100 p-3">{r.student_id}</td>
                    <td className="border-b border-slate-100 p-3">{r.name}</td>
                    <td className="border-b border-slate-100 p-3">{r.checked_in_at}</td>
                    <td className="border-b border-slate-100 p-3">
                      <StatusBadge status={r.status || "PRESENT"} />
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setStatus(r.student_id, "PRESENT")}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => setStatus(r.student_id, "LATE")}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          Late
                        </button>
                        <button
                          onClick={() => setStatus(r.student_id, "LEAVE_EARLY")}
                          className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-900 hover:bg-purple-100"
                        >
                          Leave Early
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarkAttendanceLatePage() {
  return (
    <AppShell allowedRoles={["LECTURER"]} pageTitle="Mark Attendance">
      <MarkAttendanceContent />
    </AppShell>
  );
}
