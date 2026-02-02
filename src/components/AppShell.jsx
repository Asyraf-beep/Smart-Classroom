"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, parseJwt, requireAuthOrRedirect } from "@/lib/client";
import { AppShellProvider } from "@/components/appShellContext";
import { getMenuByRole } from "@/lib/menu";


export default function AppShell({ children, allowedRoles, pageTitle }) {
  const router = useRouter();
  const [payload, setPayload] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = requireAuthOrRedirect(router);
    setToken(t);

    const p = parseJwt(t);
    if (!p) {
      router.replace("/login");
      return;
    }
    setPayload(p);
  }, [router]);

  useEffect(() => {
    if (!payload) return;
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      router.replace("/dashboard");
    }
  }, [payload, allowedRoles, router]);

  const role = payload?.role;

  const menu = getMenuByRole(role);

  function logout() {
    clearAuth();
    router.replace("/login");
  }

  if (!payload) return <div className="p-6 text-slate-600">Loading...</div>;

  return (
    <AppShellProvider value={{ payload, token }}>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Smart Classroom hehehe</h1>
              <p className="text-sm text-slate-600">
                Hi, <span className="font-medium text-slate-900">{payload.name}</span> •{" "}
                <span className="font-medium text-slate-900">{payload.role}</span>
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Sidebar */}
            <aside className="md:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Menu
                </div>

                <div className="space-y-2">
                  {menu.map((m) => (
                    <button
                      key={m.to}
                      onClick={() => router.push(m.to)}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-100"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main */}
            <main className="md:col-span-9">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {pageTitle && (
                  <>
                    <h2 className="text-xl font-bold text-slate-900">{pageTitle}</h2>
                  </>
                )}

                <div className={pageTitle ? "mt-4" : ""}>{children}</div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </AppShellProvider>
  );
}

