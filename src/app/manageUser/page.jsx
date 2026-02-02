"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/client";

function ManageUserContent() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  // create user form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("LECTURER");
  const [busy, setBusy] = useState(false);

  async function loadUsers() {
    setMsg("");
    try {
      const data = await apiFetch("/api/admin/users");
      setRows(data.users || []);
    } catch (e) {
      setMsg(e.message || "Failed to load users");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser() {
    setBusy(true);
    setMsg("");
    try {
      await apiFetch("/api/admin/users", {
        method: "POST",
        body: { name, email, password, role },
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("LECTURER");
      setMsg("✅ User created");
      await loadUsers();
    } catch (e) {
      setMsg(e.message || "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(userId, newRole) {
    setMsg("");
    try {
      await apiFetch("/api/admin/users", {
        method: "PATCH",
        body: { id: userId, role: newRole },
      });
      setMsg("✅ Role updated");
      await loadUsers();
    } catch (e) {
      setMsg(e.message || "Update failed");
    }
  }

  async function removeUser(userId) {
    if (!confirm("Delete this user?")) return;
    setMsg("");
    try {
      await apiFetch("/api/admin/users", {
        method: "DELETE",
        body: { id: userId },
      });
      setMsg("✅ User deleted");
      await loadUsers();
    } catch (e) {
      setMsg(e.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          {msg}
        </div>
      )}

      {/* Create user */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Create User</div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="John Doe"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Role</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="LECTURER">LECTURER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="COORDINATOR">COORDINATOR</option>
              <option value="STUDENT">STUDENT</option>
            </select>
          </div>
        </div>

        <button
          disabled={busy || !name || !email || !password}
          onClick={createUser}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create"}
        </button>

        <div className="mt-2 text-xs text-slate-500">
          API needed: GET/POST/PATCH/DELETE /api/admin/users
        </div>
      </div>

      {/* Users list */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Users</div>

        {rows.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No users found.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 py-2">ID</th>
                  <th className="border-b border-slate-200 py-2">Name</th>
                  <th className="border-b border-slate-200 py-2">Email</th>
                  <th className="border-b border-slate-200 py-2">Role</th>
                  <th className="border-b border-slate-200 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="border-b border-slate-100 py-2">{u.id}</td>
                    <td className="border-b border-slate-100 py-2">{u.name}</td>
                    <td className="border-b border-slate-100 py-2">{u.email}</td>
                    <td className="border-b border-slate-100 py-2">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="LECTURER">LECTURER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="COORDINATOR">COORDINATOR</option>
                      </select>
                    </td>
                    <td className="border-b border-slate-100 py-2">
                      <button
                        onClick={() => removeUser(u.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManageUserPage() {
  return (
    <AppShell allowedRoles={["ADMIN"]} pageTitle="Manage Users">
      <ManageUserContent />
    </AppShell>
  );
}
