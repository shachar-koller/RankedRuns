import { BottomNav } from "@/components/BottomNav";
import { SettingsButton } from "@/components/SettingsButton";

export function PageShell({
  children,
  withNav = true,
}: {
  children: React.ReactNode;
  withNav?: boolean;
}) {
  return (
    <main className={`min-h-screen px-5 pt-8 ${withNav ? "pb-28" : "pb-8"}`}>
      <SettingsButton />
      {children}
      {withNav ? <BottomNav /> : null}
    </main>
  );
}
