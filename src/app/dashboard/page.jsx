"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";

function DashboardContent() {
  const { payload, token } = useAppShell();
  const role = payload?.role;

  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovError, setOvError] = useState("");

  useEffect(() => {
    if (!payload) return;
    if (role !== "STUDENT") return;
    if (!token) return;

    async function loadOverview() {
      setOvLoading(true);
      setOvError("");
      try {
        const res = await fetch("/api/student/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load overview");

        setOverview(data);
      } catch (e) {
        setOvError(e.message || "Failed to load overview");
      } finally {
        setOvLoading(false);
      }
    }

    loadOverview();
  }, [payload, role, token]);

  return (
    <>
      <p className="text-sm text-slate-600">Student Dashboard</p>

      {role === "STUDENT" ? (
        <div className="mt-5 space-y-4">
          {ovLoading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Loading student overview...
            </div>
          )}

          {ovError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              {ovError}
            </div>
          )}

          {overview && (
            <>
              {/* Student Info */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Student Info
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-500">Name</div>
                    <div className="font-semibold text-slate-900">{overview.student.name}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Email</div>
                    <div className="font-semibold text-slate-900">{overview.student.email}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Student ID</div>
                    <div className="font-semibold text-slate-900">
                      {overview.student.studentId || "—"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Class</div>
                    <div className="font-semibold text-slate-900">
                      {overview.student.class_name || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attendance Percentage
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(overview.attendance?.bySubject || []).length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
                      No attendance records yet.
                    </div>
                  ) : (
                    overview.attendance.bySubject.map((s) => (
                      <div key={s.code} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">{s.code}</div>
                            <div className="text-sm text-slate-600">{s.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900">{s.percentage}%</div>
                            <div className="text-xs text-slate-500">
                              {s.attended}/{s.total} present
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-slate-900"
                            style={{ width: `${Math.max(0, Math.min(100, s.percentage))}%` }}
                          />
                        </div>

                        <div className="mt-2 text-xs text-slate-500">Minimum target: 80%</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-700">Welcome, {role}.</div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell pageTitle="Dashboard">
      <DashboardContent />
    </AppShell>
  );
}

