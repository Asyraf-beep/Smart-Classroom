"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/lib/client";

function ManageSubjectsContent() {
  const [subjects, setSubjects] = useState([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    try {
      const data = await apiFetch("/api/academic/subjects"); // GET
      setSubjects(data.subjects || []);
    } catch (e) {
      setMsg(e.message || "Failed to load subjects");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setMsg("");
    try {
      await apiFetch("/api/academic/subjects", {
        method: "POST",
        body: { code, name },
      });
      setCode("");
      setName("");
      setMsg("✅ Subject created");
      await load();
    } catch (e) {
      setMsg(e.message || "Create failed");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this subject?")) return;
    setMsg("");
    try {
      await apiFetch("/api/academic/subjects", {
        method: "DELETE",
        body: { id },
      });
      setMsg("✅ Subject deleted");
      await load();
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Create Subject</div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="CS101"
            />
          </div>

          <div>
            <div className="text-xs text-slate-500">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Programming Fundamentals"
            />
          </div>
        </div>

        <button
          disabled={!code || !name}
          onClick={create}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          Create
        </button>

        <div className="mt-2 text-xs text-slate-500">
          Coordinator can create/delete subjects.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Subjects</div>

        {subjects.length === 0 ? (
          <div className="mt-3 text-sm text-slate-600">No subjects yet.</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 py-2">Code</th>
                  <th className="border-b border-slate-200 py-2">Name</th>
                  <th className="border-b border-slate-200 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className="border-b border-slate-100 py-2">{s.code}</td>
                    <td className="border-b border-slate-100 py-2">{s.name}</td>
                    <td className="border-b border-slate-100 py-2">
                      <button
                        onClick={() => remove(s.id)}
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

        <div className="mt-2 text-xs text-slate-500">
          API needed: GET/POST/DELETE /api/academic/subjects
        </div>
      </div>
    </div>
  );
}

export default function ManageSubjectsPage() {
  return (
    <AppShell allowedRoles={["COORDINATOR"]} pageTitle="Manage Subjects">
      <ManageSubjectsContent />
    </AppShell>
  );
}
