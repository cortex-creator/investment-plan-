"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { PLATFORM_DISCLOSURE } from "@/lib/constants";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export type NavItem = {
  href: string;
  label: string;
};

export function AppShell({
  navItems,
  brandLabel,
  userName,
  roleLabel,
  children,
}: {
  navItems: NavItem[];
  brandLabel: string;
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/admin/login") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-4">
        <main className="w-full max-w-md">{children}</main>
      </div>
    );
  }
  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-muted text-brand"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-60 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <span className="text-base font-semibold text-foreground">{brandLabel}</span>
          <ThemeToggle />
        </div>
        {nav}
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium text-foreground">{userName}</p>
          <p className="text-xs text-muted">{roleLabel}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-3 w-full rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-muted cursor-pointer"
            >
              Sign out
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-snug text-muted/70">{PLATFORM_DISCLOSURE}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-border p-2 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold">{brandLabel}</span>
          <ThemeToggle />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative flex w-64 flex-col bg-surface">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <span className="text-base font-semibold">{brandLabel}</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="cursor-pointer">
                  ✕
                </button>
              </div>
              {nav}
              <div className="border-t border-border p-4">
                <div className="mb-3"><ThemeToggle /></div>
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted">{roleLabel}</p>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="mt-3 w-full rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-muted cursor-pointer"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
