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
            <div className="flex items-center gap-3">
              <strong>Move Label Manager</strong>
              {user && (
                <nav className="flex gap-2 text-sm">
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/boxes/new">New Box</Link>
                  <Link href="/labels">Labels</Link>
                  <Link href="/scan">Scan</Link>
                  <Link href="/unpacking">Unpacking</Link>
                </nav>
              )}
            </div>
            {user ? <LogoutButton /> : <Link href="/login">Login</Link>}
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
