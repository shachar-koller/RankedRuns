import Link from "next/link";
import { Settings } from "lucide-react";

export function SettingsButton() {
  return (
    <Link
      aria-label="Settings"
      className="fixed right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/95 text-ink shadow-card backdrop-blur"
      href="/settings"
    >
      <Settings size={20} />
    </Link>
  );
}
