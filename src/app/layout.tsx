import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ranked Runs",
  description: "A mobile-first 1v1 basketball ranking app for communities.",
  icons: {
    icon: "/ranked-runs-logo.png",
    apple: "/ranked-runs-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const key = "ranked-runs-theme";
    const saved = localStorage.getItem(key) || "system";
    const useDark = saved === "dark" || (saved === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", useDark);
    document.documentElement.dataset.theme = saved;
  } catch {
    document.documentElement.dataset.theme = "system";
  }
})();
`,
          }}
        />
      </head>
      <body className="min-h-screen bg-paper antialiased">
        <div className="mx-auto min-h-screen w-full max-w-md bg-paper">{children}</div>
      </body>
    </html>
  );
}
