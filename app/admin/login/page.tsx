"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, LockKeyhole, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/brand-lockup";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthMode = "sign-in" | "sign-up";
type Feedback = {
  type: "success" | "error";
  message: string;
};

function getSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;
  return window.location.origin;
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    async function redirectSignedInAdmin() {
      const { data } = await supabase!.auth.getSession();
      if (data.session) router.replace(nextPath);
    }

    void redirectSignedInAdmin();
  }, [nextPath, router]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setFeedback({ type: "error", message: "Supabase is not configured." });
      return;
    }

    if (!email.trim() || !password) {
      setFeedback({ type: "error", message: "Email and password are required." });
      return;
    }

    if (password.length < 6) {
      setFeedback({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      setIsSubmitting(false);

      if (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      router.push(nextPath);
      return;
    }

    const redirectTo = `${getSiteOrigin()}/admin/login?next=${encodeURIComponent("/admin")}`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    if (!data.session) {
      setFeedback({
        type: "success",
        message: "Account created. Check your email, then sign in.",
      });
      setMode("sign-in");
      return;
    }

    router.push(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-pink-300/25 bg-pink-300/10 text-pink-100">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <BrandLockup size="sm" suffix="Owner Console" />
            <h1 className="mt-1 text-2xl font-black text-white">Owner login</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
              Audience and DJ links stay public. Event management is protected here.
            </p>
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-50">
            Local mock mode is active, so owner login is skipped.
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            className={[
              "min-h-10 rounded-md text-sm font-black transition",
              mode === "sign-in" ? "bg-white text-[#12091f]" : "text-slate-300 hover:text-white",
            ].join(" ")}
            onClick={() => setMode("sign-in")}
            type="button"
          >
            Sign in
          </button>
          <button
            className={[
              "min-h-10 rounded-md text-sm font-black transition",
              mode === "sign-up" ? "bg-white text-[#12091f]" : "text-slate-300 hover:text-white",
            ].join(" ")}
            onClick={() => setMode("sign-up")}
            type="button"
          >
            Create owner
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submitAuth}>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Email
            </label>
            <Input
              autoComplete="email"
              className="mt-2"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Password
            </label>
            <Input
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              className="mt-2"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              type="password"
              value={password}
            />
          </div>

          {feedback ? (
            <div
              className={[
                "flex items-start gap-2 rounded-lg border p-3 text-sm font-bold leading-6",
                feedback.type === "success"
                  ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-50"
                  : "border-pink-300/20 bg-pink-300/10 text-pink-50",
              ].join(" ")}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {feedback.message}
            </div>
          ) : null}

          <Button className="w-full" disabled={isSubmitting || !isSupabaseConfigured} type="submit">
            {mode === "sign-up" ? <UserPlus className="h-5 w-5" aria-hidden="true" /> : null}
            {isSubmitting ? "Working..." : mode === "sign-in" ? "Sign in" : "Create owner account"}
          </Button>
        </form>
      </Card>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
          <Card className="w-full p-5 text-sm font-bold text-slate-300">Loading owner login...</Card>
        </main>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
