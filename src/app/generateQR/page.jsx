"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAppShell } from "@/components/appShellContext";
import { apiFetch } from "@/lib/client";

function GenerateQR() {
  const { payload } = useAppShell(); // token available too if you need it
  const role = payload?.role;

  const [timetables, setTimetables] = useState([]);
  const [timetableId, setTimetableId] = useState("");

  const [qr, setQr] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const [attendance, setAttendance] = useState([]);
  const [msg, setMsg] = useState("");

  // Lecturer location (used as room coordinate at QR generation time)
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locStatus, setLocStatus] = useState("idle"); // idle | loading | ok | error
  const [locError, setLocError] = useState("");

  // Load timetables
  useEffect(() => {
    if (!payload) return;
    if (role !== "LECTURER") return;

    (async () => {
      try {
        const data = await apiFetch("/api/academic/session?mine=1");
        setTimetables(data.timetables || []);
      } catch (e) {
        setMsg(e.message || "Failed to load timetables");
      }
    })();
  }, [payload, role]);

  // Poll attendance list when sessionId is active
  useEffect(() => {
    if (!sessionId) return;

    const timer = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/attendance/list?sessionId=${sessionId}`);
        setAttendance(data.rows || []);
      } catch {
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [sessionId]);

  // auto request location on load
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestLocation() {
    setLocStatus("loading");
    setLocError("");

    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      setLocError("Geolocation not supported on this device.");
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
        setLocError(err.message || "Failed to get location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }

  async function start() {
    setMsg("Starting session...");
    try {
      if (!timetableId) throw new Error("Please select timetable first.");
      if (locStatus !== "ok" || lat == null || lng == null) {
        throw new Error("Please allow location and click 'Get Location' first.");
      }

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
    setMsg("Ending session...");
    try {
      await apiFetch("/api/qr/end", {
        method: "POST",
        body: { sessionId },
      });

      setMsg("✅ Session ended.");
      setSessionId(null);
      setQr(null);
      setAttendance([]);
    } catch (e) {
      setMsg(e.message || "End failed");
    }
  }

  const canStart = Boolean(timetableId) && locStatus === "ok";

  return (
    <div className="space-y-4">
      {/* Select timetable */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Select Timetable
        </div>

        <select
          value={timetableId}
          onChange={(e) => setTimetableId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">-- select --</option>
          {timetables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.subject_code} ({t.section}) - {t.date} {t.start_time}-{t.end_time} @ {t.room}
            </option>
          ))}
        </select>

        {/* Lecturer Location block */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">
            Room Coordinate (from lecturer location)
          </div>

          <div className="mt-2 text-sm">
            {locStatus === "ok" && <span className="text-green-700">Available ✅</span>}
            {locStatus === "loading" && <span className="text-slate-600">Getting…</span>}
            {locStatus === "error" && <span className="text-red-700">Not available ❌</span>}
            {locStatus === "idle" && <span className="text-slate-600">—</span>}
          </div>

          {locStatus === "ok" && (
            <div className="mt-1 text-xs text-slate-600">
              Accuracy: ~{Math.round(accuracy || 0)}m
            </div>
          )}

          {locStatus === "error" && locError && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {locError}
            </div>
          )}

          <button
            type="button"
            onClick={requestLocation}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Get Location
          </button>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            disabled={!canStart}
            onClick={start}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Start / Generate QR
          </button>

          <button
            disabled={!sessionId}
            onClick={end}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
          >
            End Session
          </button>
        </div>

        <div className="mt-2 text-xs text-slate-500">
          Tip: Start requires timetable selected + location available.
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          {msg}
        </div>
      )}

      {/* QR + Attendance */}
      {qr && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">QR Code</div>
            <img src={qr} alt="QR" className="mt-3 h-[260px] w-[260px]" />
            <div className="mt-3 text-xs text-slate-500">
              Students scan with phone camera → opens check-in page.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">
              Attendance List (updates every 2s)
            </div>

            {attendance.length === 0 ? (
              <div className="mt-3 text-sm text-slate-600">No check-ins yet.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="border-b border-slate-200 py-2">Student ID</th>
                      <th className="border-b border-slate-200 py-2">Name</th>
                      <th className="border-b border-slate-200 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((r, idx) => (
                      <tr key={idx}>
                        <td className="border-b border-slate-100 py-2">{r.student_id}</td>
                        <td className="border-b border-slate-100 py-2">{r.name}</td>
                        <td className="border-b border-slate-100 py-2">{r.checked_in_at}</td>
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

