"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, User, LogOut, Home } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { XIcon, InstagramIcon } from "@/components/ui/BrandIcons";

const X_PATH = "/dashboard/x";
const IG_PATH = "/dashboard/instagram";

export function Sidebar({
  xPending,
  igPending,
}: {
  xPending: number;
  igPending: number;
}) {
  const pathname = usePathname();

  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
      active
        ? "bg-accent/10 text-accent"
        : "text-muted hover:bg-surface-2 hover:text-text"
    }`;

  return (
    <aside className="hidden h-screen sticky top-0 w-60 shrink-0 border-r border-border bg-surface/30 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Platforms
        </p>
        <div className="space-y-1">
          <Link href={X_PATH} className={itemClass(pathname === X_PATH)}>
            <XIcon style={{ fontSize: 16 }} />
            <span className="flex-1">X (Twitter)</span>
            {xPending > 0 && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                {xPending}
              </span>
            )}
          </Link>
          <Link href={IG_PATH} className={itemClass(pathname === IG_PATH)}>
            <InstagramIcon style={{ fontSize: 16 }} />
            <span className="flex-1">Instagram</span>
            {igPending > 0 && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                {igPending}
              </span>
            )}
          </Link>
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Account
        </p>
        <div className="space-y-1">
          <Link
            href="/billing"
            className={itemClass(pathname === "/billing")}
          >
            <CreditCard size={16} />
            <span className="flex-1">Billing</span>
          </Link>
          <Link
            href="/profile"
            className={itemClass(pathname === "/profile")}
          >
            <User size={16} />
            <span className="flex-1">App Profile</span>
          </Link>
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <Link href="/" className={itemClass(false)}>
          <Home size={16} />
          <span className="flex-1">Back to landing page</span>
        </Link>
        <Link href="/login" className={itemClass(false)}>
          <LogOut size={16} />
          <span className="flex-1">Sign out</span>
        </Link>
      </div>
    </aside>
  );
}