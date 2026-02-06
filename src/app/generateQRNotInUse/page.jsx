"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import { apiFetch } from "@/lib/client";

function GenerateQR() {
  const { payload } = useAppShell();
  const role = payload?.role;

  const [timetables, setTimetables] = useState([]);
  const [timetableId, setTimetableId] = useState("");

  const [qr, setQr] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [msg, setMsg] = useState("");

  // Lecturer location
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locStatus, setLocStatus] = useState("idle");
  const [locError, setLocError] = useState("");

  // Load timetables
  useEffect(() => {
    if (!payload || role !== "LECTURER") return;

    (async () => {
      try {
        const data = await apiFetch("/api/academic/session?mine=1");
        setTimetables(data.timetables || []);
      } catch (e) {
        setMsg(e.message || "Failed to load timetables");
      }
    })();
  }, [payload, role]);

  // Poll attendance list
  useEffect(() => {
    if (!sessionId) return;

    const timer = setInterval(async () => {
      try {
        const data = await apiFetch(
          `/api/attendance/list?sessionId=${sessionId}`
        );
        setAttendance(data.rows || []);
      } catch {}
    }, 2000);

    return () => clearInterval(timer);
  }, [sessionId]);

  // Auto request location
  useEffect(() => {
    requestLocation();
  }, []);

  function requestLocation() {
    setLocStatus("loading");
    setLocError("");

    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      setLocError("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy);
        setLocStatus("ok");
      },
      (err) => {
        setLocStatus("error");
        setLocError(err.message || "Failed to get location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }

  async function start() {
    try {
      if (!timetableId) throw new Error("Select timetable first");
      if (locStatus !== "ok") throw new Error("Location not ready");

      const data = await apiFetch("/api/qr/start", {
        method: "POST",
        body: {
          timetableId: Number(timetableId),
          roomLat: lat,
          roomLng: lng,
          roomAccuracyM: accuracy,
          tolerance: 80,
        },
      });

      setQr(data.qrDataUrl);
      setSessionId(data.sessionId);
      setMsg("✅ Session started. Show QR to students.");
    } catch (e) {
      setMsg(e.message || "Start failed");
    }
  }

  async function end() {
    try {
      await apiFetch("/api/qr/end", {
        method: "POST",
        body: { sessionId },
      });

      setSessionId(null);
      setQr(null);
      setAttendance([]);
      setMsg("✅ Session ended.");
    } catch (e) {
      setMsg(e.message || "End failed");
    }
  }

  const canStart = Boolean(timetableId) && locStatus === "ok";

  return (
    <div className="space-y-4">
      {/* Select timetable */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-xs font-semibold uppercase text-slate-500">
          Select Timetable
        </div>

        <select
          value={timetableId}
          onChange={(e) => setTimetableId(e.target.value)}
          className="mt-2 w-full rounded-xl border px-3 py-2"
        >
          <option value="">-- select --</option>
          {timetables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.subject_code} ({t.section}) - {t.date}{" "}
              {t.start_time}-{t.end_time} @ {t.room}
            </option>
          ))}
        </select>

        {/* Location */}
        <div className="mt-4 rounded-xl border bg-slate-50 p-4">
          <div className="text-sm font-semibold">Room Coordinate</div>
          <div className="mt-1 text-sm">
            {locStatus === "ok" && "Available ✅"}
            {locStatus === "loading" && "Getting…"}
            {locStatus === "error" && "Not available ❌"}
          </div>

          {locStatus === "ok" && (
            <div className="text-xs text-slate-600">
              Accuracy ~{Math.round(accuracy || 0)}m
            </div>
          )}

          {locError && (
            <div className="mt-2 text-xs text-red-700">{locError}</div>
          )}

          <button
            onClick={requestLocation}
            className="mt-3 w-full rounded-xl border bg-white py-2 text-sm"
          >
            Get Location
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            disabled={!canStart}
            onClick={start}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
          >
            Start / Generate QR
          </button>

          <button
            disabled={!sessionId}
            onClick={end}
            className="rounded-xl border px-4 py-2 disabled:opacity-60"
          >
            End Session
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border bg-slate-50 p-3 text-sm">
          {msg}
        </div>
      )}

      {/* QR + Attendance */}
      {qr && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4">
            <div className="font-semibold">QR Code</div>
            <img src={qr} alt="QR" className="mt-3 h-64 w-64" />
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="font-semibold">
              Attendance List (auto refresh)
            </div>

            {attendance.length === 0 ? (
              <div className="mt-3 text-sm">No check-ins yet.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[700px] table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="border-b py-2 whitespace-nowrap">
                        Student ID
                      </th>
                      <th className="border-b py-2 whitespace-nowrap">
                        Name
                      </th>
                      <th className="border-b py-2 text-center whitespace-nowrap">
                        Late
                      </th>
                      <th className="border-b py-2 text-center whitespace-nowrap">
                        Leave Early
                      </th>
                      <th className="border-b py-2 whitespace-nowrap">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((r, i) => (
                      <tr key={i}>
                        <td className="border-b py-2">
                          {r.student_id}
                        </td>
                        <td className="border-b py-2">
                          {r.name}
                        </td>

                        <td className="border-b py-2 text-center">
                          <input
                            type="checkbox"
                            onChange={() => {
                              setAttendance((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? { ...row, is_late: !row.is_late }
                                    : row
                                )
                              );
                            }}
                          />
                        </td>

                        <td className="border-b py-2 text-center">
                          <input
                            type="checkbox"
                            onChange={() => {
                              setAttendance((prev) =>
                                prev.map((row, idx) =>
                                  idx === i
                                    ? {
                                        ...row,
                                        leave_early: !row.leave_early,
                                      }
                                    : row
                                )
                              );
                            }}
                          />
                        </td>

                        <td className="border-b py-2 whitespace-nowrap">
                          {r.checked_in_at}
                        </td>
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

export default function LecturerPage() {
  return (
    <AppShell allowedRoles={["LECTURER"]} pageTitle="Generate QR">
      <GenerateQR />
    </AppShell>
  );
}
