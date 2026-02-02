"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Row({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-semibold text-slate-900">{value ?? "—"}</div>
    </div>
  );
}

export default function InfoCard({ title, rows = [] }) {
  return (
    <Card className="bg-slate-50">
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
