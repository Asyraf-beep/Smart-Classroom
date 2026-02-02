"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/client";

function ManageClassTimetableContent() {
  const [msg, setMsg] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [classes, setClasses] = useState([]);

  const [subjectId, setSubjectId] = useState("");
  const [section, setSection] = useState("");
  const [lecturerUserId, setLecturerUserId] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [timetable, setTimetable] = useState([]);

  // timetable create form
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");

  async function loadInit() {
    setMsg("");
    try {
      const s = await apiFetch("/api/academic/subjects"); // GET subjects
      setSubjects(s.subjects || []);

      const u = await apiFetch("/api/admin/users?role=LECTURER"); // GET lecturers
      setLecturers(u.users || []);

      const c = await apiFetch("/api/admin/classes"); // GET classes
      setClasses(c.classes || []);
    } catch (e) {
      setMsg(e.message || "Failed to load data");
    }
  }

  useEffect(() => {
    loadInit();
  }, []);

  async function loadTimetable(classId) {
    setMsg("");
    try {
      const t = await apiFetch(`/api/admin/timetable?classId=${encodeURIComponent(classId)}`);
      setTimetable(t.rows || []);
    } catch (e) {
      setMsg(e.message || "Failed to load timetable");
    }
  }

  async function createClass() {
    setMsg("");
    try {
      await apiFetch("/api/admin/classes", {
        method: "POST",
        body: {
          subjectId: Number(subjectId),
          section,
          lecturerUserId: Number(lecturerUserId),
        },
      });
      setMsg("✅ Class created");
      setSubjectId("");
      setSection("");
      setLecturerUserId("");
      await loadInit();
    } catch (e) {
      setMsg(e.message || "Create class failed");
    }
  }

  async function createTimetable() {
    setMsg("");
    try {
      await apiFetch("/api/admin/timetable", {
        method: "POST",
        body: {
          classId: Number(selectedClassId),
          date,
          start_time: startTime,
          end_time: endTime,
          room,
        },
      });
      setMsg("✅ Timetable added");
      setDate("");
      setStartTime("");
      setEndTime("");
      setRoom("");
      await loadTimetable(selectedClassId);
    } catch (e) {
      setMsg(e.message || "Create timetable failed");
    }
  }

  async function deleteTimetable(id) {
    if (!confirm("Delete this timetable?")) return;
    setMsg("");
    try {
      await apiFetch("/api/admin/timetable", {
        method: "DELETE",
        body: { id },
      });
      setMsg("✅ Timetable deleted");
      await loadTimetable(selectedClassId);
    } catch (e) {
      setMsg(e.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          {msg}
        </div>
      )}

      {/* Create Class */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Create Class</div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Subject</div>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">-- select --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs text-slate-500">Section</div>
            <input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="A"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Lecturer</div>
            <select
              value={lecturerUserId}
              onChange={(e) => setLecturerUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">-- select --</option>
              {lecturers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          disabled={!subjectId || !section || !lecturerUserId}
          onClick={createClass}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Create Class
        </button>

        <div className="mt-2 text-xs text-slate-500">
          API needed: GET/POST /api/admin/classes, GET /api/admin/users?role=LECTURER
        </div>
      </div>

      {/* Classes list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Classes</div>

        {classes.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No classes yet.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 py-2">Class ID</th>
                  <th className="border-b border-slate-200 py-2">Subject</th>
                  <th className="border-b border-slate-200 py-2">Section</th>
                  <th className="border-b border-slate-200 py-2">Lecturer</th>
                  <th className="border-b border-slate-200 py-2">Timetable</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td className="border-b border-slate-100 py-2">{c.id}</td>
                    <td className="border-b border-slate-100 py-2">
                      {c.subjectCode} - {c.subjectName}
                    </td>
                    <td className="border-b border-slate-100 py-2">{c.section}</td>
                    <td className="border-b border-slate-100 py-2">{c.lecturerName}</td>
                    <td className="border-b border-slate-100 py-2">
                      <button
                        onClick={async () => {
                          setSelectedClassId(String(c.id));
                          await loadTimetable(String(c.id));
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Timetable */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Timetable</div>

        {!selectedClassId ? (
          <div className="mt-3 text-sm text-slate-600">Select a class to view timetable.</div>
        ) : (
          <>
            {/* add timetable */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="2026-02-01"
                />
              </div>

              <div>
                <div className="text-xs text-slate-500">Start</div>
                <input
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="10:00"
                />
              </div>

              <div>
                <div className="text-xs text-slate-500">End</div>
                <input
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="12:00"
                />
              </div>

              <div>
                <div className="text-xs text-slate-500">Room</div>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Lab 1"
                />
              </div>
            </div>

            <button
              disabled={!date || !startTime || !endTime || !room}
              onClick={createTimetable}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Add Timetable
            </button>

            {/* timetable list */}
            {timetable.length === 0 ? (
              <div className="mt-3 text-sm text-slate-600">No timetable rows.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="border-b border-slate-200 py-2">Date</th>
                      <th className="border-b border-slate-200 py-2">Time</th>
                      <th className="border-b border-slate-200 py-2">Room</th>
                      <th className="border-b border-slate-200 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.map((t) => (
                      <tr key={t.id}>
                        <td className="border-b border-slate-100 py-2">{t.date}</td>
                        <td className="border-b border-slate-100 py-2">
                          {t.start_time}-{t.end_time}
                        </td>
                        <td className="border-b border-slate-100 py-2">{t.room}</td>
                        <td className="border-b border-slate-100 py-2">
                          <button
                            onClick={() => deleteTimetable(t.id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2 text-xs text-slate-500">
              API needed: GET/POST/DELETE /api/admin/timetable still under construction sadge :(
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ManageClassTimetablePage() {
  return (
    <AppShell allowedRoles={["ADMIN"]} pageTitle="Class & Timetable">
      <ManageClassTimetableContent />
    </AppShell>
  );
}
