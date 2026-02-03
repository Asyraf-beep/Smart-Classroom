"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, saveAuth } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
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
        body: { email, password },
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
    <>
      {/* We define the custom keyframes here because standard Tailwind 
        doesn't have built-in utilities for these specific clip-path 
        and 3D rotation animations.
      */}
      <style jsx global>{`
        @keyframes ch {
          0%, 100% { clip-path: inset(0 0 98% 0); }
          25% { clip-path: inset(0 98% 0 0); }
          50% { clip-path: inset(98% 0 0 0); }
          75% { clip-path: inset(0 0 0 98%); }
        }
        @keyframes orbit-1 { to { transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg); } }
        @keyframes orbit-2 { to { transform: rotateX(50deg) rotateY(10deg) rotateZ(360deg); } }
        @keyframes orbit-3 { to { transform: rotateX(35deg) rotateY(55deg) rotateZ(360deg); } }
      `}</style>

      {/* Main Container with Background Image */}
      <div 
        className="min-h-screen w-full flex justify-center items-center bg-cover bg-center"
        style={{ backgroundImage: "url('/login_background.png')" }}
      >
        <div className="relative w-full max-w-md p-1">
            
          {/* The Animated Border Container 
             We use absolute positioning and the 'ch' animation defined above.
          */}
          <div 
            className="absolute inset-0 border-2 border-white pointer-events-none z-10"
            style={{ animation: 'ch 8s infinite linear' }}
          />

          {/* Glass Card Container */}
          <div className="relative z-0 w-full bg-gradient-to-tr from-[#a1c0ff99] via-[#b3a8e8b3] to-[#fbfcfd80] backdrop-blur-sm p-8 shadow-2xl">
            
            {/* Header / Logo */}
            <div className="text-center mb-8">
              <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-md border border-white/30">
                <img src="/systemlogo.svg" alt="System Logo" className="w-12 h-12" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white drop-shadow-md tracking-wider">
                Login
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={onLogin} className="space-y-6">
              
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-white text-lg font-light drop-shadow-sm mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="text" 
                  required
                  className="w-full bg-transparent border-b-2 border-white/60 text-white placeholder-white/50 focus:outline-none focus:border-white focus:shadow-[0_2px_0_white] transition-all duration-300 py-2 px-1 text-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-white text-lg font-light drop-shadow-sm mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full bg-transparent border-b-2 border-white/60 text-white placeholder-white/50 focus:outline-none focus:border-white focus:shadow-[0_2px_0_white] transition-all duration-300 py-2 px-1 text-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {/* Error Message */}
              {msg && (
                <div className="bg-red-500/20 border border-red-200/50 rounded p-3 backdrop-blur-md">
                  <p className="text-sm text-red-100 font-medium text-center shadow-black drop-shadow-sm">
                    {msg}
                  </p>
                </div>
              )}

              {/* Submit Button Container with Orbit Animation */}
              <div className="relative w-full flex justify-center mt-10 group">
                {/* The Button */}
                <button
                  disabled={loading}
                  className="relative z-20 text-2xl font-bold text-white uppercase tracking-widest bg-transparent border-none outline-none cursor-pointer drop-shadow-lg group-hover:drop-shadow-[0_2px_3px_white] transition-all"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                {/* Orbiting Rings (Background decoration) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 pointer-events-none z-10 group-hover:scale-110 transition-transform duration-500">
                  <div 
                    className="absolute inset-0 rounded-full border-b-[6px] border-[#65a7ca]"
                    style={{ transform: 'rotateX(35deg) rotateY(-45deg)', animation: 'orbit-1 1.5s linear infinite' }}
                  ></div>
                  <div 
                    className="absolute inset-0 rounded-full border-r-[6px] border-[#988cdd]"
                    style={{ transform: 'rotateX(50deg) rotateY(10deg)', animation: 'orbit-2 1.5s linear infinite' }}
                  ></div>
                  <div 
                    className="absolute inset-0 rounded-full border-t-[6px] border-white"
                    style={{ transform: 'rotateX(35deg) rotateY(55deg)', animation: 'orbit-3 1.5s linear infinite' }}
                  ></div>
                </div>
              </div>

              {/* Extra Link: Create Account */}
              <div className="text-center mt-8 pt-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="text-sm text-white/80 hover:text-white hover:underline transition-colors shadow-black drop-shadow-sm"
                >
                  Create an account
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}