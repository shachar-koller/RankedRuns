import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import { BrandLogo } from "@/components/BrandLogo";
import { PageShell } from "@/components/PageShell";
import { getCurrentUser } from "@/lib/data";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const configured = hasSupabaseEnv();
  const user = configured ? await getCurrentUser(await createClient()) : null;

  return (
    <PageShell withNav={false}>
      <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center">
            <BrandLogo className="drop-shadow-sm" priority size={58} />
          </div>

          <div className="pt-10">
            <p className="text-base font-black uppercase text-court">Ranked Runs</p>
            <h1 className="mt-3 text-5xl font-black leading-tight tracking-normal text-ink">
              1v1 rankings for real basketball communities.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Join a school, park, gym, or friend group. Challenge players, submit results, and let
              Ranked Runs show who's best, once and for all.
            </p>
          </div>
        </div>

        <div className="space-y-4 pb-6">
          {user ? (
            <Link className="btn-primary w-full" href="/dashboard">
              Go to dashboard
            </Link>
          ) : (
            <AuthButton disabled={!configured} signedIn={false} />
          )}
          {!configured ? (
            <p className="text-center text-xs font-semibold text-slate-500">
              Add Supabase values to `.env.local` to enable Google sign-in.
            </p>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
