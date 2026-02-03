function TypeBadge({ type }) {
  const base = "rounded-full border px-2 py-0.5 text-xs font-semibold";
  const map = {
    notification: "border-slate-300 bg-white text-slate-700",
    checkin: "border-slate-300 bg-white text-slate-700",
    session: "border-slate-300 bg-white text-slate-700",
    user: "border-slate-300 bg-white text-slate-700",
    low: "border-red-200 bg-red-50 text-red-700",
  };

  return <span className={`${base} ${map[type] || map.notification}`}>{type}</span>;
}

export default function ActivityFeed({ items = [], title = "Recent Activity" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>

      {items.length === 0 ? (
        <div className="mt-3 text-sm text-slate-600">No recent activity.</div>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{it.title}</div>
                  {it.subtitle && <div className="mt-0.5 text-sm text-slate-700">{it.subtitle}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <TypeBadge type={it.type} />
                  <div className="text-xs text-slate-500">{it.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
