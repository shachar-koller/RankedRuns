import { BrandLogo } from "@/components/BrandLogo";
import { formatRecord } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/types";

export function CurrentPlayerStatsCard({ stats }: { stats: LeaderboardEntry | null }) {
  if (!stats) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <p className="font-semibold">You are in this community.</p>
        <p className="mt-1 text-sm text-slate-500">Your stat line will appear after the first sync.</p>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-orange-500 bg-court-dark p-5 text-white shadow-card"
      id="you"
    >
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border border-white/10" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70">You</p>
          <h2 className="text-2xl font-black">{stats.profile.display_name}</h2>
        </div>
        <BrandLogo className="rounded-full bg-white/95 p-1 shadow-sm" size={52} />
      </div>
      <div className="mt-6 grid grid-cols-3 divide-x divide-white/15">
        <Stat label="Elo" value={stats.elo_rating} accent />
        <Stat label="Record" value={formatRecord(stats.wins, stats.losses)} />
        <Stat label="Rank" value={`#${stats.rank}`} />
      </div>
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="px-2 first:pl-0 last:pr-0">
      <p className="text-[11px] font-semibold uppercase text-white/60">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent ? "text-court" : "text-white"}`}>{value}</p>
    </div>
  );
}
