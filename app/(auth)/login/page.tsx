"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111]">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            NoShow
            <span className="inline-block w-1.5 h-1.5 bg-[#e8502a] rounded-full ml-0.5 translate-y-[-3px]" />
          </h1>
          <p className="mt-1 text-sm text-[#888888]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#888888] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a] focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#888888] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#e8502a] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#d44424] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#888888]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-white hover:text-[#e8502a] transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
