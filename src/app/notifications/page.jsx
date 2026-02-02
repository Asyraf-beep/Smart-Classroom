"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import { apiFetch } from "@/lib/client";

function NotificationsContent() {
  const { payload, token } = useAppShell();
  const role = payload?.role;

  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch("/api/notification");
      setItems(data.notifications || []);
    } catch (e) {
      setMsg(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!payload) return;
    if (!token) return;

    // Only students should see this page
    if (role !== "STUDENT") {
      setMsg("Forbidden: Students only.");
      setItems([]);
      return;
    }

    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, token, role]);

  async function markRead(id) {
    setMsg("");
    try {
      await apiFetch("/api/notification", {
        method: "POST",
        body: { id }, // ✅ object (apiFetch will stringify)
      });
      await loadNotifications();
    } catch (e) {
      setMsg(e.message || "Failed to mark read");
    }
  }

  return (
    <>
      <p className="text-sm text-slate-600">Student Notifications</p>

      {loading && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          Loading notifications...
        </div>
      )}

      {msg && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {msg}
        </div>
      )}

      {!loading && !msg && items.length === 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">
          No notifications.
        </div>
      )}

      <div className="mt-5 space-y-3">
        {items.map((n) => {
          const unread = !n.read_at;

          return (
            <div
              key={n.id}
              className={[
                "rounded-2xl border p-4 shadow-sm",
                unread ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{n.title}</div>

                  {/* Optional: show subject/class info if your API returns these */}
                  {(n.subjectCode || n.subjectName || n.section) && (
                    <div className="mt-1 text-xs text-slate-500">
                      {n.subjectCode ? `${n.subjectCode}` : ""}
                      {n.section ? ` (${n.section})` : ""}
                      {n.subjectName ? ` • ${n.subjectName}` : ""}
                    </div>
                  )}
                </div>

                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-1 text-xs font-semibold",
                    unread ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700",
                  ].join(" ")}
                >
                  {unread ? "Unread" : "Read"}
                </span>
              </div>

              <div className="mt-2 text-sm text-slate-700">{n.message}</div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {n.created_at}
                </div>

                {unread && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <AppShell pageTitle="Notifications">
      <NotificationsContent />
    </AppShell>
  );
}

