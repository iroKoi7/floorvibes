"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AdminAuthGateProps = {
  children: ReactNode;
};

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsChecking(false);
      return;
    }

    let isMounted = true;

    async function checkSession() {
      const { data } = await supabase!.auth.getSession();
      if (!isMounted) return;

      if (!data.session) {
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/admin/login?next=${next}`);
        return;
      }

      setIsChecking(false);
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        const next = encodeURIComponent(pathname || "/admin");
        router.replace(`/admin/login?next=${next}`);
      }
    });

    void checkSession();

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
        <Card className="w-full p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-200/10 text-cyan-100">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-bold text-slate-300">Checking admin session...</p>
        </Card>
      </main>
    );
  }

  return <>{children}</>;
}

export function AdminLockedFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-pink-300/20 bg-pink-300/10 text-pink-100">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-300">Admin login is required.</p>
      </Card>
    </main>
  );
}
