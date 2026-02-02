"use client";

import MessageBox from "@/components/MessageBox";

export default function LocationStatus({
  title = "Location",
  locStatus,
  accuracy,
  locError,
  onRequest,
}) {
  return (
    <div className="mt-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-700 font-semibold">{title}</span>
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
        <div className="mt-2">
          <MessageBox type="error">{locError}</MessageBox>
        </div>
      )}

      <button
        type="button"
        onClick={onRequest}
        className="mt-3 w-full rounded-xl border border-slate-300 py-2 font-semibold text-slate-900 hover:bg-slate-100"
      >
        Get Location
      </button>
    </div>
  );
}
