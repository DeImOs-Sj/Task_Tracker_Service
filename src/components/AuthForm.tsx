"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FEATURES = [
  { icon: "✓", label: "Organize tasks into workspaces" },
  { icon: "↕", label: "Drag & drop to reorder anything" },
  { icon: "📅", label: "Deadlines with overdue alerts" },
  { icon: "@", label: "Attach links, notes, and files" },
];

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Signup failed");
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("Invalid email or password");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branded */}
      <div className="hidden lg:flex lg:w-[45%] bg-nav flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/10" />
          <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-tk-amber/10" />
          <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-accent/5" />
        </div>

        {/* Logo */}
        <div className="relative">
          <span className="text-2xl font-bold text-white tracking-tight">
            Task<span className="text-accent">Nest</span>
          </span>
        </div>

        {/* Center content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-3">
              Get things<br />
              <span className="text-accent">done.</span>
            </h2>
            <p className="text-gray-400 text-base leading-relaxed max-w-xs">
              A focused task manager built for clarity. No clutter, just your work.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-navlight flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-accent">{f.icon}</span>
                </div>
                <span className="text-sm text-gray-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-gray-600">
          TaskNest — built for focus.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-tk-bg">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <span className="text-2xl font-bold text-nav tracking-tight">
              Task<span className="text-accent">Nest</span>
            </span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-tk-border p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-tk-text">
                {mode === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-tk-muted mt-1">
                {mode === "login"
                  ? "Sign in to continue to TaskNest"
                  : "Start organizing your work today"}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-tk-muted mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-tk-border bg-tk-bg text-tk-text text-sm placeholder:text-tk-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tk-muted mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-tk-border bg-tk-bg text-tk-text text-sm placeholder:text-tk-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2.5 rounded-xl">
                  <span className="flex-shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white font-semibold py-3 rounded-xl hover:bg-blue-600 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Please wait…
                  </span>
                ) : mode === "login" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="mt-6 text-sm text-tk-muted text-center">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="text-accent font-semibold hover:underline">
                    Sign up free
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="text-accent font-semibold hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
