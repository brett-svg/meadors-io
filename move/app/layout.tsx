import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Move Label Manager",
  description: "Moving box labels, scanning, inventory and exports",
  manifest: "/manifest.webmanifest"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-7xl px-4 py-4">
          <header className="mb-4 card p-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <Link href="/dashboard" className="flex items-center gap-2 no-underline" style={{ textDecoration: "none" }}>
                <span style={{ fontSize: "1.3rem" }}>📦</span>
                <strong style={{ color: "var(--fg)" }}>MoveTracker</strong>
              </Link>
              {user && (
                <nav className="hidden sm:flex gap-1 text-sm ml-2">
                  <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">Dashboard</Link>
                  <Link href="/boxes" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">All Boxes</Link>
                  <Link href="/boxes/new" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">+ New Box</Link>
                  <Link href="/labels" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">Labels</Link>
                  <Link href="/scan" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">📷 Scan</Link>
                  <Link href="/unpacking" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-700 font-medium">Unpacking</Link>
                </nav>
              )}
            </div>
            {user ? <LogoutButton /> : <Link href="/login">Login</Link>}
          </header>

          {children}

          {user && (
            <nav className="bottom-nav">
              <Link href="/dashboard" className="bottom-nav-item">
                <span className="bottom-nav-icon">🏠</span>
                Home
              </Link>
              <Link href="/boxes" className="bottom-nav-item">
                <span className="bottom-nav-icon">📋</span>
                Boxes
              </Link>
              <Link href="/boxes/new" className="bottom-nav-item">
                <span className="bottom-nav-icon">➕</span>
                New Box
              </Link>
              <Link href="/scan" className="bottom-nav-item">
                <span className="bottom-nav-icon">📷</span>
                Scan
              </Link>
              <Link href="/unpacking" className="bottom-nav-item">
                <span className="bottom-nav-icon">📬</span>
                Unpack
              </Link>
              <Link href="/labels" className="bottom-nav-item">
                <span className="bottom-nav-icon">🏷️</span>
                Labels
              </Link>
            </nav>
          )}
        </div>
      </body>
    </html>
  );
}
