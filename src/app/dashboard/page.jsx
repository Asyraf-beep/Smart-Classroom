"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import InfoCard from "@/components/InfoCard";
import MessageBox from "@/components/MessageBox";
import AttendanceSubjectCard from "@/components/AttendanceSubjectCard";

function DashboardContent() {
  const { payload, token } = useAppShell();
  const role = payload?.role;

  // ✅ DB-backed profile for ALL roles
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState("");

  // ✅ Student-only attendance overview (keep this)
  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovError, setOvError] = useState("");

  // Load /api/me for everyone
  useEffect(() => {
    if (!payload || !token) return;

    async function loadMe() {
      setMeLoading(true);
      setMeError("");
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load profile");
        setMe(data.user);
      } catch (e) {
        setMeError(e.message || "Failed to load profile");
      } finally {
        setMeLoading(false);
      }
    }

    loadMe();
  }, [payload, token]);

  // Load /api/student/overview only for student (for attendance)
  useEffect(() => {
    if (!payload || !token) return;
    if (role !== "STUDENT") return;

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
      <p className="text-sm text-slate-600">Dashboard</p>

      {/* Profile */}
      <div className="mt-5 space-y-4">
        {meLoading && <MessageBox>Loading your profile...</MessageBox>}
        {meError && <MessageBox type="error">{meError}</MessageBox>}

        {me && (
          <InfoCard
            title={`${me.role} Info`}
            rows={[
              { label: "Name", value: me.name },
              { label: "Email", value: me.email },
              { label: "Role", value: me.role },
              { label: "Joined", value: me.created_at },
            ]}
          />
        )}
      </div>

      {/* Student attendance (keep) */}
      {role === "STUDENT" && (
        <div className="mt-5 space-y-4">
          {ovLoading && <MessageBox>Loading attendance...</MessageBox>}
          {ovError && <MessageBox type="error">{ovError}</MessageBox>}

          {overview && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Attendance Percentage
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(overview.attendance?.bySubject || []).length === 0 ? (
                  <MessageBox>No attendance records yet.</MessageBox>
                ) : (
                  overview.attendance.bySubject.map((s) => (
                    <AttendanceSubjectCard
                      key={s.code}
                      code={s.code}
                      name={s.name}
                      percentage={s.percentage}
                      attended={s.attended}
                      total={s.total}
                    />
                  ))
                )}
              </div>
            </div>
          )}
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


