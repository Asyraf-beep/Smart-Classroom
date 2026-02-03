"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import InfoCard from "@/components/InfoCard";
import MessageBox from "@/components/MessageBox";
import StatTiles from "@/components/StatTiles";
import ActivityFeed from "@/components/ActivityFeed";
import AttendanceSubjectCard from "@/components/AttendanceSubjectCard";
import { apiFetch } from "@/lib/client";

function DashboardContent() {
  const { payload } = useAppShell();
  const role = payload?.role;

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState("");

  const [summary, setSummary] = useState(null);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumError, setSumError] = useState("");

  // student overview (attendance by subject)
  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovError, setOvError] = useState("");

  // Load /api/me for all roles
  useEffect(() => {
    if (!payload) return;

    (async () => {
      setMeLoading(true);
      setMeError("");
      try {
        const data = await apiFetch("/api/me");
        setMe(data.user);
      } catch (e) {
        setMeError(e.message || "Failed to load profile");
      } finally {
        setMeLoading(false);
      }
    })();
  }, [payload]);

  // Load dashboard summary (tiles + activity)
  useEffect(() => {
    if (!payload) return;

    (async () => {
      setSumLoading(true);
      setSumError("");
      try {
        const data = await apiFetch("/api/dashboard/summary");
        setSummary(data);
      } catch (e) {
        setSumError(e.message || "Failed to load dashboard summary");
      } finally {
        setSumLoading(false);
      }
    })();
  }, [payload]);

  // ✅ Load /api/student/overview only for STUDENT
  useEffect(() => {
    if (!payload) return;
    if (role !== "STUDENT") return;

    (async () => {
      setOvLoading(true);
      setOvError("");
      try {
        const data = await apiFetch("/api/student/overview");
        setOverview(data);
      } catch (e) {
        setOvError(e.message || "Failed to load student overview");
      } finally {
        setOvLoading(false);
      }
    })();
  }, [payload, role]);

  return (
    <>
      <p className="text-sm text-slate-600">Dashboard</p>

      <div className="mt-5 space-y-4">
        {/* Profile */}
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

        {/* Summary */}
        {sumLoading && <MessageBox>Loading dashboard stats...</MessageBox>}
        {sumError && <MessageBox type="error">{sumError}</MessageBox>}

        {summary && (
          <>
            <StatTiles tiles={summary.tiles || []} />
            <ActivityFeed items={summary.activity || []} title="Recent Activity" />
          </>
        )}

        {/* ✅ Student Overview */}
        {role === "STUDENT" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Student Overview
            </div>

            {ovLoading && <MessageBox>Loading your attendance overview...</MessageBox>}
            {ovError && <MessageBox type="error">{ovError}</MessageBox>}

            {overview && (
              <>

                {/* Attendance by subject */}
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
              </>
            )}
          </div>
        )}

        {!meLoading && !sumLoading && me && !summary && !sumError && (
          <MessageBox>No dashboard data yet.</MessageBox>
        )}

        {!meLoading && role && (
          <div className="text-xs text-slate-500">Logged in as: {role}</div>
        )}
      </div>
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



