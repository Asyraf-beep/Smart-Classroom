"use client";

 import { useState } from "react";
 import { useRouter } from "next/navigation";
 import { apiFetch } from "@/lib/client";

 export default function RegisterPage() {
   const router = useRouter();

   const [name, setName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");

   const [msg, setMsg] = useState("");
   const [loading, setLoading] = useState(false);

   async function onRegister(e) {
     e.preventDefault();
     setMsg("");
     setLoading(true);

     try {
       const data = await apiFetch("/api/auth/register", {
         method: "POST",
         body: { name, email, password },
       });

       // optional: show generated student id (if your API returns it)
       if (data?.studentId) {
         setMsg(`✅ Registered! Your Student ID: ${data.studentId}. Redirecting...`);
       } else {
         setMsg("✅ Registered successfully. Redirecting to login...");
       }

       setTimeout(() => router.replace("/login"), 900);
     } catch (err) {
       setMsg(err.message || "Registration failed");
     } finally {
       setLoading(false);
     }
   }

   return (
     <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
       <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-500 shadow-sm p-8">
         <h1 className="text-3xl font-bold text-slate-950">Student Register</h1>
         <p className="mt-1 text-sm text-slate-600">
           Student ID will be generated automatically.
         </p>

         <form onSubmit={onRegister} className="mt-5 space-y-4">
           <div>
             <label className="text-sm font-semibold text-slate-900">Name</label>
             <input
               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-400"
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="Your full name"
               autoComplete="name"
               required
             />
           </div>

           <div>
             <label className="text-sm font-semibold text-slate-900">Email</label>
             <input
               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-400"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="abu@student.com"
               autoComplete="email"
               required
             />
           </div>

           <div>
             <label className="text-sm font-semibold text-slate-900">Password</label>
             <input
               type="password"
               className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-400"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               placeholder="••••••••"
               autoComplete="new-password"
               required
             />
           </div>

           {msg && (
             <div
               className={[
                 "rounded-xl border px-3 py-2 text-sm",
                 msg.startsWith("✅")
                   ? "border-green-200 bg-green-50 text-green-700"
                   : "border-red-200 bg-red-50 text-red-700",
               ].join(" ")}
             >
               {msg}
             </div>
           )}

           <button
             disabled={loading}
             className="w-full rounded-xl bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60"
           >
             {loading ? "Creating..." : "Create Account"}
           </button>

           <button
             type="button"
             onClick={() => router.push("/login")}
             className="w-full rounded-xl border border-slate-500 py-2.5 font-medium text-slate-900 hover:bg-slate-100"
           >
             Back to Login
           </button>
         </form>
       </div>
     </div>
   );
 }


