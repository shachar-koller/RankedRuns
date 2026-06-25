"use client";

import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthButton({ signedIn, disabled = false }: { signedIn: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signIn() {
    setIsPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setIsPending(false);
  }

  async function signOut() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (signedIn) {
    return (
      <button className="btn-secondary gap-2" disabled={isPending} onClick={signOut} type="button">
        <LogOut size={18} />
        {isPending ? "Signing out..." : "Sign out"}
      </button>
    );
  }

  return (
    <button className="btn-primary gap-2" disabled={disabled || isPending} onClick={signIn} type="button">
      <LogIn size={18} />
      {disabled ? "Configure Supabase first" : isPending ? "Opening Google..." : "Continue with Google"}
    </button>
  );
}
