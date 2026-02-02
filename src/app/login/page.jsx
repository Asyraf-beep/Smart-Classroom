"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("example@student.com");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password }, // <— object, apiFetch will JSON stringify
      });

      // your login API returns: { token, role, name }
      saveAuth({ token: data.token, role: data.role, name: data.name });

      router.replace("/dashboard");
    } catch (err) {
      setMsg(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-500 shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-950">Login</h1>


        <form onSubmit={onLogin} className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-900">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {msg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {msg}
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/register")}
            className="w-full rounded-xl border border-slate-500 py-2.5 font-medium hover:bg-slate-500"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
}

