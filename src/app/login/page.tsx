"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, ShieldCheck, User, Lock, Key, AlertCircle, Sparkles } from "lucide-react";

// Pre-computed SHA-256 hashes for security demonstration
// "admin123" -> "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"
// "user123"  -> "e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446"
const VALID_ACCOUNTS: Record<string, { hash: string; role: "organizer" | "participant" }> = {
  organizer: {
    hash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    role: "organizer",
  },
  participant: {
    hash: "e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446",
    role: "participant",
  },
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("organizer");
  const [password, setPassword] = useState("admin123");
  const [role, setRole] = useState<"organizer" | "participant">("organizer");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (typeof window !== "undefined" && sessionStorage.getItem("userRole")) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const trimmedUser = username.trim().toLowerCase();
      const account = VALID_ACCOUNTS[trimmedUser];

      if (!account) {
        setError("Invalid username. Use 'organizer' or 'participant'.");
        setIsLoading(false);
        return;
      }

      const inputHash = await hashPassword(password);
      if (inputHash !== account.hash) {
        setError("Invalid password. (organizer: admin123, participant: user123)");
        setIsLoading(false);
        return;
      }

      // Store authenticated role & username in sessionStorage
      sessionStorage.setItem("userRole", account.role);
      sessionStorage.setItem("username", username.trim());
      sessionStorage.setItem("lastActivity", Date.now().toString());

      router.push("/");
    } catch (err: any) {
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (selectedRole: "organizer" | "participant") => {
    setRole(selectedRole);
    if (selectedRole === "organizer") {
      setUsername("organizer");
      setPassword("admin123");
    } else {
      setUsername("participant");
      setPassword("user123");
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1315] text-[#E7EEEF] flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#4A3A1E] border border-[#E8A33D] shadow-lg shadow-[#E8A33D]/20 mb-1">
            <ListChecks size={24} className="text-[#E8A33D]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#E7EEEF] tracking-tight">
            Inno<span className="text-[#E8A33D]">vexa</span> Ops Console
          </h1>
          <p className="text-xs text-[#8FA0A4]">
            Meeting Intelligence & Action Tracking System
          </p>
        </div>

        {/* Login Panel */}
        <div className="ops-panel p-6 sm:p-8 space-y-6 shadow-2xl border-[#2A363A]">
          {/* Role Selection */}
          <div className="space-y-2">
            <label className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] block">
              SELECT ACCESS ROLE
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillCredentials("organizer")}
                className={`p-3 text-left rounded-md border transition-all ${
                  role === "organizer"
                    ? "bg-[#1D272B] border-[#E8A33D] text-[#E7EEEF]"
                    : "bg-[#141C1F] border-[#2A363A] text-[#8FA0A4] hover:border-[#5B6A6E]"
                }`}
              >
                <ShieldCheck size={18} className={role === "organizer" ? "text-[#E8A33D]" : "text-[#5B6A6E]"} />
                <div className="text-xs font-semibold mt-1.5">Organizer</div>
                <div className="text-[10px] text-[#5B6A6E] mt-0.5">Full Edit & SLA Access</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("participant")}
                className={`p-3 text-left rounded-md border transition-all ${
                  role === "participant"
                    ? "bg-[#1D272B] border-[#49B9AE] text-[#E7EEEF]"
                    : "bg-[#141C1F] border-[#2A363A] text-[#8FA0A4] hover:border-[#5B6A6E]"
                }`}
              >
                <User size={18} className={role === "participant" ? "text-[#49B9AE]" : "text-[#5B6A6E]"} />
                <div className="text-xs font-semibold mt-1.5">Participant</div>
                <div className="text-[10px] text-[#5B6A6E] mt-0.5">Read-Only View</div>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] block mb-1.5">
                USERNAME
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA0A4]" />
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="organizer or participant"
                  className="ops-input w-full pl-9 pr-3 py-2.5 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-wider text-[#5B6A6E] block mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8FA0A4]" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="ops-input w-full pl-9 pr-3 py-2.5 text-xs font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-[#3A2224] border border-[#E2666A] p-3 text-xs text-[#E2666A] flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-md bg-[#E8A33D] text-[#1A1305] font-display text-xs font-bold uppercase tracking-wider hover:bg-[#d8932d] transition-all disabled:opacity-50 shadow-md shadow-[#E8A33D]/20"
            >
              {isLoading ? "AUTHENTICATING..." : "ENTER CONSOLE"}
            </button>
          </form>

          {/* Preset Info Footer */}
          <div className="rounded-md bg-[#141C1F] border border-[#212B2E] p-3 text-[11px] font-mono text-[#5B6A6E] space-y-1">
            <div className="text-[#8FA0A4] font-semibold">Demo Credentials:</div>
            <div>Organizer: <span className="text-[#E8A33D]">organizer</span> / <span className="text-[#E8A33D]">admin123</span></div>
            <div>Participant: <span className="text-[#49B9AE]">participant</span> / <span className="text-[#49B9AE]">user123</span></div>
          </div>
        </div>

        <div className="text-center font-mono text-[10px] text-[#5B6A6E]">
          PU PS 6 — Intelligent Meeting, Decision & Action System
        </div>
      </div>
    </div>
  );
}
