"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/client";

function CoordReportContent() {
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  async function loadOverall() {
    setMsg("Loading overall...");
    try {
      const data = await apiFetch(`/api/reports/overall?classId=${encodeURIComponent(classId)}`);
      setRows(data.rows || []);
      setMsg("✅ Overall loaded");
    } catch (e) {
      setMsg(e.message || "Failed");
    }
  }

  async function loadLow() {
    setMsg("Loading low attendance...");
    try {
      const data = await apiFetch(`/api/reports/lowAttendance?classId=${encodeURIComponent(classId)}`);
      setRows(data.rows || []);
      setMsg("✅ Low attendance loaded");
    } catch (e) {
      setMsg(e.message || "Failed");
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Reports</div>

        <div className="mt-3">
          <div className="text-xs text-slate-500">Class ID</div>
          <input
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="e.g. 1"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={!classId}
            onClick={loadOverall}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            View Overall
          </button>

          <button
            disabled={!classId}
            onClick={loadLow}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
          >
            Generate Low Attendance
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          API needed: GET /api/reports/overall and GET /api/reports/low
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Result</div>

        {rows.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No report loaded.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 py-2">Student ID</th>
                  <th className="border-b border-slate-200 py-2">Name</th>
                  <th className="border-b border-slate-200 py-2">%</th>
                  <th className="border-b border-slate-200 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="border-b border-slate-100 py-2">{r.student_id}</td>
                    <td className="border-b border-slate-100 py-2">{r.name}</td>
                    <td className="border-b border-slate-100 py-2">{r.percent}</td>
                    <td className="border-b border-slate-100 py-2">{r.status}</td>
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

export default function CoordReportPage() {
  return (
    <AppShell allowedRoles={["COORDINATOR"]} pageTitle="Coordinator Reports">
      <CoordReportContent />
    </AppShell>
  );
}
