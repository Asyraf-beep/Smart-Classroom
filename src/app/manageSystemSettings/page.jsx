"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/client";

function ManageSystemSettingsContent() {
  const [threshold, setThreshold] = useState("80");
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // info | success | error

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      try {
        const s = await apiFetch("/api/admin/manageSetting");
        if (s?.attendance_threshold != null) {
          setThreshold(String(s.attendance_threshold));
        }
      } catch (e) {
        setMsgType("error");
        setMsg(e.message || "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveSettings() {
    setMsgType("info");
    setMsg("Saving settings...");
    try {
      // basic validation
      const n = Number(threshold);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new Error("Attendance threshold must be a number between 0 and 100.");
      }

      await apiFetch("/api/admin/manageSetting", {
        method: "POST",
        body: { attendance_threshold: String(n) },
      });

      setMsgType("success");
      setMsg("✅ Settings saved");
    } catch (e) {
      setMsgType("error");
      setMsg(e.message || "Save settings failed");
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={[
            "rounded-2xl border p-4 text-sm",
            msgType === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : msgType === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-slate-200 bg-slate-50 text-slate-800",
          ].join(" ")}
        >
          {msg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">System Settings</div>

        <div className="mt-3">
          <label className="text-sm font-semibold text-slate-900">
            Attendance Threshold (%)
          </label>

          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            disabled={loading}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
          />

          <div className="mt-2 text-xs text-slate-500">
            Students below this percentage will receive low attendance notifications.
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={loading}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function ManageSystemSettingsPage() {
  return (
    <AppShell allowedRoles={["ADMIN"]} pageTitle="Manage System Settings">
      <ManageSystemSettingsContent />
    </AppShell>
  );
}
