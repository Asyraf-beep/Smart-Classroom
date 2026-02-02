"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";

export default function CheckinPage() {
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [locStatus, setLocStatus] = useState("idle"); // idle | loading | ok | error
  const [locError, setLocError] = useState("");

  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestLocation();
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
        // common: 1 permission denied, 2 unavailable, 3 timeout
        setLocError(err.message || "Failed to get location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );
  }

  async function submitAttendance(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      // you probably already read token from URL like ?token=...
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token");

      const data = await apiFetch("/api/attendance/submit", {
        method: "POST",
        body: {
          token,
          studentId,
          password,
          lat,
          lng,
          accuracy,
        },
      });

      setMsg(
        `✅ Attendance recorded` +
          (data?.distanceMeters != null
            ? ` • Distance: ${Math.round(data.distanceMeters)}m`
            : "")
      );
    } catch (err) {
      setMsg(err.message || "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-300 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-950">Attendance Check-in</h1>

        <div className="mt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 font-semibold">Location</span>
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
            className="mt-3 w-full rounded-xl border border-slate-300 py-2 font-semibold text-slate-900 hover:bg-slate-100"
          >
            Get Location
          </button>
        </div>

        <form onSubmit={submitAttendance} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-900">Student ID</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {msg && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
              {msg}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Submit Attendance"}
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Location is used only for range validation and is not stored.
        </p>
      </div>
    </div>
  );
}
