"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/client";

function EnrollContent() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [available, setAvailable] = useState([]); // all classes
  const [mine, setMine] = useState([]); // my enrolled classes

  // dropdown filter only
  const [subjectFilter, setSubjectFilter] = useState("ALL");

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const data = await apiFetch("/api/student/classes"); // { available, mine }
      setAvailable(data?.available || []);
      setMine(data?.mine || []);
    } catch (e) {
      setErr(e.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myClassIdSet = useMemo(() => new Set(mine.map((x) => x.classId)), [mine]);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    for (const c of available) {
      const code = c.subjectCode || "";
      const name = c.subjectName || "";
      if (!code) continue;
      map.set(code, name);
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [available]);

  const filteredAvailable = useMemo(() => {
    return (available || [])
      .filter((c) => {
        if (myClassIdSet.has(c.classId)) return false; // hide already-enrolled
        if (subjectFilter !== "ALL" && c.subjectCode !== subjectFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const s = (a.subjectCode || "").localeCompare(b.subjectCode || "");
        if (s !== 0) return s;
        return (a.section || "").localeCompare(b.section || "");
      });
  }, [available, myClassIdSet, subjectFilter]);

  async function enroll(classId) {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      await apiFetch("/api/student/enroll", {
        method: "POST",
        body: { classId },
      });
      setMsg("✅ Enrolled successfully");
      await load();
    } catch (e) {
      setErr(e.message || "Enroll failed");
    } finally {
      setLoading(false);
    }
  }

  async function unenroll(classId) {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      await apiFetch("/api/student/enroll", {
        method: "DELETE",
        body: { classId },
      });
      setMsg("✅ Removed enrollment");
      await load();
    } catch (e) {
      setErr(e.message || "Unenroll failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* messages */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          Loading...
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      )}

      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          {msg}
        </div>
      )}

      {/* dropdown only */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filter
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="ALL">All subjects</option>
              {subjectOptions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1 flex items-end">
            <button
              type="button"
              onClick={load}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* two columns */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* my enrollments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">My Enrollments</div>
              <div className="text-xs text-slate-500">Classes you already joined</div>
            </div>
            <div className="text-xs text-slate-500">{mine.length} enrolled</div>
          </div>

          {mine.length === 0 ? (
            <div className="mt-4 text-sm text-slate-600">
              You are not enrolled in any class yet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {mine.map((c) => (
                <div
                  key={c.classId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {c.subjectCode} ({c.section})
                      </div>
                      <div className="text-sm text-slate-600">{c.subjectName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Lecturer: {c.lecturerName || "—"}
                      </div>
                    </div>

                    <button
                      onClick={() => unenroll(c.classId)}
                      disabled={loading}
                      className="h-fit rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                    >
                      Unenroll
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* available */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Available Classes</div>
              <div className="text-xs text-slate-500">Pick a section to enroll</div>
            </div>
            <div className="text-xs text-slate-500">{filteredAvailable.length} available</div>
          </div>

          {filteredAvailable.length === 0 ? (
            <div className="mt-4 text-sm text-slate-600">
              No available classes for this subject (or you already enrolled).
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredAvailable.map((c) => (
                <div key={c.classId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {c.subjectCode} ({c.section})
                      </div>
                      <div className="text-sm text-slate-600">{c.subjectName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Lecturer: {c.lecturerName || "—"}
                      </div>
                    </div>

                    <button
                      onClick={() => enroll(c.classId)}
                      disabled={loading}
                      className="h-fit rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      Enroll
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Note: You can only enroll one class per subject.
      </div>
    </div>
  );
}

export default function EnrollPage() {
  return (
    <AppShell allowedRoles={["STUDENT"]} pageTitle="Enroll Classes">
      <EnrollContent />
    </AppShell>
  );
}

