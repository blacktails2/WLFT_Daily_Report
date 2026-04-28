"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-sm px-6">
        <h1
          className="text-[var(--color-accent)] mb-10 heading-expanded text-[28px] md:text-[36px]"
          style={{ letterSpacing: "-0.015em" }}
        >
          Daily Report
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-6">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full py-2 pr-10 bg-transparent border-b border-[var(--color-main)] focus:outline-none focus:border-[var(--color-accent)] transition-all ease-in duration-100 text-[18px] md:text-[21px]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-main-hover)] hover:text-[var(--color-accent)] transition-all ease-in duration-100"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-[var(--color-accent)] text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-full border border-[var(--color-accent)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] disabled:opacity-50 transition-all ease-in duration-100"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
