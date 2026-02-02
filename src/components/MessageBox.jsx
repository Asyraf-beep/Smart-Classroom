"use client";

export default function MessageBox({ type = "info", children }) {
  // type: "info" | "error" | "success" | "warning"
  const styles = {
    info: "border-slate-200 bg-slate-50 text-slate-800",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };

  const cls = styles[type] || styles.info;

  if (!children) return null;

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      {children}
    </div>
  );
}
