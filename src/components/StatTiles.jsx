export default function StatTiles({ tiles = [] }) {
  if (!tiles.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.label}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{t.value}</div>
          {t.sub && <div className="mt-1 text-xs text-slate-600">{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}
