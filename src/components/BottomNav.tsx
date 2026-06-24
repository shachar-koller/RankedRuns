"use client";

import Link from "next/link";
import { ClipboardList, Home, Trophy, UserRound, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/challenges", label: "Challenges", icon: ClipboardList },
  { href: "/communities", label: "Communities", icon: UsersRound },
  { href: "/players", label: "Players", icon: Trophy },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-slate-200 bg-white/95 px-2 pb-3 pt-2 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${
                active ? "text-court" : "text-slate-600"
              }`}
              href={item.href}
              key={item.href}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
