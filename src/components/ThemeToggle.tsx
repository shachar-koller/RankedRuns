"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import * as React from "react";

type ThemePreference = "light" | "dark" | "system";

const storageKey = "ranked-runs-theme";
const options: Array<{ value: ThemePreference; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<ThemePreference>("system");

  React.useEffect(() => {
    const saved = window.localStorage.getItem(storageKey) as ThemePreference | null;
    const nextTheme = saved && ["light", "dark", "system"].includes(saved) ? saved : "system";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  function updateTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    document.cookie = `${storageKey}=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
    applyTheme(nextTheme);
  }

  return (
    <div className="card p-5">
      <h3 className="font-black">Appearance</h3>
      <p className="mt-1 text-sm text-slate-500">Choose how Ranked Runs looks on this device.</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;

          return (
            <button
              aria-pressed={active}
              className={`min-h-11 rounded-xl border px-3 text-sm font-bold transition ${
                active ? "border-court bg-orange-50 text-court" : "border-slate-300 bg-white text-ink"
              }`}
              key={option.value}
              onClick={() => updateTheme(option.value)}
              type="button"
            >
              <span className="flex items-center justify-center gap-2">
                <Icon size={17} />
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function applyTheme(theme: ThemePreference) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", useDark);
  document.documentElement.dataset.theme = theme;
}
