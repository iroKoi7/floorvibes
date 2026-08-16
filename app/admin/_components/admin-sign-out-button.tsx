"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function AdminSignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (!supabase) return;
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (!supabase) return null;

  return (
    <Button
      className="min-h-10 px-3 py-2 text-xs"
      disabled={isSigningOut}
      onClick={() => void signOut()}
      type="button"
      variant="ghost"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
