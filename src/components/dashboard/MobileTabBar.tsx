"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, User } from "lucide-react";
import { XIcon, InstagramIcon } from "@/components/ui/BrandIcons";

const X_PATH = "/dashboard/x";
const IG_PATH = "/dashboard/instagram";

export function MobileTabBar({
  xPending,
  igPending,
}: {
  xPending: number;
  igPending: number;
}) {
  const pathname = usePathname();
  const tabClass = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
      active ? "text-accent" : "text-muted"
    }`;

  return (
    <div className="sticky top-14 sm:top-16 z-30 flex items-center border-b border-border bg-bg/95 backdrop-blur md:hidden">
      <Link href={X_PATH} className={tabClass(pathname === X_PATH)}>
        <XIcon style={{ fontSize: 14 }} />
        X
        {xPending > 0 && (
          <span className="ml-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">
            {xPending}
          </span>
        )}
      </Link>
      <Link href={IG_PATH} className={tabClass(pathname === IG_PATH)}>
        <InstagramIcon style={{ fontSize: 14 }} />
        IG
        {igPending > 0 && (
          <span className="ml-0.5 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">
            {igPending}
          </span>
        )}
      </Link>
      <Link href="/billing" className={tabClass(pathname === "/billing")}>
        <CreditCard size={14} />
        Billing
      </Link>
      <Link href="/profile" className={tabClass(pathname === "/profile")}>
        <User size={14} />
        Profile
      </Link>
    </div>
  );
}