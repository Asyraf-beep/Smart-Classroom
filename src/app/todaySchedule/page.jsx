"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import { apiFetch } from "@/lib/client";
import MessageBox from "@/components/MessageBox";
import ScheduleList from "@/components/ScheduleList";

function TodayScheduleContent() {
  const { payload } = useAppShell();
  const role = payload?.role;

  const [date, setDate] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!payload) return;
    if (role !== "STUDENT") return;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch("/api/student/todaySchedule");
        setItems(data.rows || []);
        setDate(data.date || "");
      } catch (e) {
        setErr(e.message || "Failed to load today's schedule");
      } finally {
        setLoading(false);
      }
    })();
  }, [payload, role]);

  if (!payload) return <MessageBox>Loading...</MessageBox>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {date ? `Date: ${date}` : "Today's Schedule"}
      </p>

      {role !== "STUDENT" ? (
        <MessageBox type="error">Only students can view this page.</MessageBox>
      ) : (
        <ScheduleList
          title="Today's Schedule"
          items={items}
          loading={loading}
          error={err}
          emptyText="No classes scheduled today."
        />
      )}
    </div>
  );
}

export default function TodaySchedulePage() {
  return (
    <AppShell allowedRoles={["STUDENT"]} pageTitle="Today's Schedule">
      <TodayScheduleContent />
    </AppShell>
  );
}
