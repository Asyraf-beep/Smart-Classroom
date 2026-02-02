"use client";

export default function AttendanceSubjectCard({
  code,
  name,
  percentage,
  attended,
  total,
}) {
  const pct = Math.max(0, Math.min(100, Number(percentage || 0)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">{code}</div>
          <div className="text-sm text-slate-600">{name}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{pct}%</div>
          <div className="text-xs text-slate-500">
            {attended}/{total} present
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-2 text-xs text-slate-500">Minimum target: 80%</div>
    </div>
  );
}
