"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import { apiFetch } from "@/lib/client";

function ManageContent() {
  const { payload, token } = useAppShell();
  const role = payload?.role;

  const [tab, setTab] = useState("reports");
  const [msg, setMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(false);

  // quick forms
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [threshold, setThreshold] = useState("80");

  const [classIdForReport, setClassIdForReport] = useState("");
  const [reportRows, setReportRows] = useState([]);

  const tabs = useMemo(() => {
    if (role === "ADMIN") return ["reports", "settings", "subjects"];
    if (role === "COORDINATOR") return ["reports", "subjects"];
    return [];
  }, [role]);

  // load threshold when page opens (admin only)
  useEffect(() => {
    if (!role) return;

    (async () => {
      try {
        const s = await apiFetch("/api/admin/manageSetting");
        if (s?.attendance_threshold != null) {
          setThreshold(String(s.attendance_threshold));
        }
      } catch {
        // ignore
      }
    })();
  }, [role]);

  async function createSubject() {
    setLoadingMsg(true);
    setMsg("Creating subject...");
    try {
      await apiFetch("/api/academic/subjects", {
        method: "POST",
        body: { code: subjectCode, name: subjectName }, // ✅ object body
      });
      setMsg("✅ Subject created");
      setSubjectCode("");
      setSubjectName("");
    } catch (e) {
      setMsg(e.message || "Create subject failed");
    } finally {
      setLoadingMsg(false);
    }
  }

  async function saveSettings() {
    setLoadingMsg(true);
    setMsg("Saving settings...");
    try {
      await apiFetch("/api/admin/manageSetting", {
        method: "POST",
        body: { attendance_threshold: threshold }, // ✅ object body
      });
      setMsg("✅ Settings saved");
    } catch (e) {
      setMsg(e.message || "Save settings failed");
    } finally {
      setLoadingMsg(false);
    }
  }

  async function loadOverall() {
    setLoadingMsg(true);
    setMsg("Generating report...");
    try {
      const data = await apiFetch(`/api/reports/overall?classId=${encodeURIComponent(classIdForReport)}`);
      setReportRows(data.rows || []);
      setMsg("✅ Report ready");
    } catch (e) {
      setMsg(e.message || "Generate report failed");
    } finally {
      setLoadingMsg(false);
    }
  }

  // ✅ PDF export that works even if API requires Authorization header
  async function exportPdf(type) {
    try {
      if (!classIdForReport) throw new Error("Enter Class ID first.");

      const url = `/api/reports/exportPDF?type=${encodeURIComponent(type)}&classId=${encodeURIComponent(
        classIdForReport
      )}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      // optional: later revoke
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
    } catch (e) {
      setMsg(e.message || "Export failed");
    }
  }

  if (!role) {
    return <div className="text-slate-600">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "rounded-xl px-3 py-2 text-sm font-semibold",
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
              ].join(" ")}
            >
              {t.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Message */}
      {msg && (
        <div
          className={[
            "rounded-2xl border p-4 text-sm",
            msg.startsWith("✅")
              ? "border-green-200 bg-green-50 text-green-800"
              : loadingMsg
              ? "border-slate-200 bg-slate-50 text-slate-800"
              : "border-red-200 bg-red-50 text-red-800",
          ].join(" ")}
        >
          {msg}
        </div>
      )}

      {/* SUBJECTS */}
      {tab === "subjects" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Create Subject</div>

          <div className="mt-3 space-y-3">
            <div>
              <label className="text-sm font-semibold text-slate-900">Code</label>
              <input
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                placeholder="CS101"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900">Name</label>
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Programming"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <button
              onClick={createSubject}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* SETTINGS (ADMIN only) */}
      {tab === "settings" && role === "ADMIN" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">System Settings</div>

          <div className="mt-3">
            <label className="text-sm font-semibold text-slate-900">
              Attendance Threshold (%)
            </label>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <button
            onClick={saveSettings}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save
          </button>
        </div>
      )}

      {/* REPORTS */}
      {tab === "reports" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-900">Reports</div>

          <div className="mt-3">
            <label className="text-sm font-semibold text-slate-900">Class ID</label>
            <input
              value={classIdForReport}
              onChange={(e) => setClassIdForReport(e.target.value)}
              placeholder="Class ID (from seed)"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={loadOverall}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Generate Overall
            </button>

            <button
              onClick={() => exportPdf("overall")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Export PDF (Overall)
            </button>

            <button
              onClick={() => exportPdf("low")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Export PDF (Low)
            </button>
          </div>

          <div className="mt-4">
            {reportRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                No report loaded.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="border-b border-slate-200 p-3 text-left">Student ID</th>
                      <th className="border-b border-slate-200 p-3 text-left">Name</th>
                      <th className="border-b border-slate-200 p-3 text-left">%</th>
                      <th className="border-b border-slate-200 p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((r, idx) => (
                      <tr key={idx} className="text-slate-900">
                        <td className="border-b border-slate-100 p-3">{r.student_id}</td>
                        <td className="border-b border-slate-100 p-3">{r.name}</td>
                        <td className="border-b border-slate-100 p-3">{r.percent}</td>
                        <td className="border-b border-slate-100 p-3">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagePage() {
  return (
    <AppShell allowedRoles={["ADMIN", "COORDINATOR"]} pageTitle="Management Panel">
      <ManageContent />
    </AppShell>
  );
}

