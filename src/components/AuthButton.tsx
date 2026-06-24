"use client";

import { LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthButton({ signedIn, disabled = false }: { signedIn: boolean; disabled?: boolean }) {
  const router = useRouter();

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (signedIn) {
    return (
      <button className="btn-secondary gap-2" onClick={signOut} type="button">
        <LogOut size={18} />
        Sign out
      </button>
    );
  }

  return (
    <button className="btn-primary gap-2" disabled={disabled} onClick={signIn} type="button">
      <LogIn size={18} />
      {disabled ? "Configure Supabase first" : "Continue with Google"}
    </button>
  );
}
