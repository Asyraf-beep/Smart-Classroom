"use client";

import MessageBox from "@/components/MessageBox";

export default function ScheduleList({
  title = "Today's Schedule",
  items = [],
  loading = false,
  error = "",
  emptyText = "No classes scheduled for today.",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>

      {loading && <div className="mt-3"><MessageBox>Loading schedule...</MessageBox></div>}
      {error && <div className="mt-3"><MessageBox type="error">{error}</MessageBox></div>}

      {!loading && !error && items.length === 0 && (
        <div className="mt-3 text-sm text-slate-600">{emptyText}</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-3 space-y-3">
          {items.map((x) => (
            <div
              key={x.timetableId}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">
                    {x.subjectCode} <span className="text-slate-600">({x.section})</span>
                  </div>
                  <div className="text-sm text-slate-600">{x.subjectName}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Lecturer: {x.lecturerName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-slate-900">
                    {x.startTime} - {x.endTime}
                  </div>
                  <div className="text-sm text-slate-600">{x.room}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
