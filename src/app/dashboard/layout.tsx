"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, CreditCard, User, LogOut, Home } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { CreditWidget } from "@/components/dashboard/CreditWidget";
import { TopUpModal } from "@/components/dashboard/TopUpModal";
import { LowBalanceBanner } from "@/components/dashboard/LowBalanceBanner";
import { OnboardingProvider } from "@/components/dashboard/OnboardingContext";
import { Logo } from "@/components/ui/Logo";
import { XIcon, InstagramIcon } from "@/components/ui/BrandIcons";
import { signOut } from "next-auth/react";
import { listLeads, getBillingStatus } from "@/lib/data";
import { useToast } from "@/components/ui/Toast";

export default function DashboardLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [xPending, setXPending] = useState(0);
  const [igPending, setIgPending] = useState(0);
  const [lowBalance, setLowBalance] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const paymentHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || paymentHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    // Mark handled immediately to guarantee it only triggers once
    paymentHandledRef.current = true;

    // Clean URL query parameters immediately
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    router.replace(cleanUrl, { scroll: false });

    if (payment === "success") {
      const amount = params.get("amount");
      const val = amount ? parseFloat(amount) : 0;
      if (val > 0) {
        toast.success(`Top-up of $${val.toFixed(2)} was successful!`);
      } else {
        toast.success("Top-up was successful!");
      }
      // Force credit widget to update
      window.dispatchEvent(new CustomEvent("billing-updated"));
    } else if (payment === "cancelled") {
      toast.error("Top-up was cancelled.");
    }
  }, [router, toast]);

  useEffect(() => {
    const fetchCounts = async () => {
      const [x, ig, status] = await Promise.all([
        listLeads("X", "PENDING"),
        listLeads("INSTAGRAM", "PENDING"),
        getBillingStatus(),
      ]);
      setXPending(x.length);
      setIgPending(ig.length);
      setLowBalance(
        status.free_demo_credits_remaining === 0 && status.credit_balance < 0.1
      );
    };
    fetchCounts();
    // poll every 30s for new leads (real-time stub, see PRD §G.11 tahap 5)
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navItemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors ${
      active
        ? "bg-accent/10 text-accent font-semibold"
        : "text-muted hover:bg-surface-2 hover:text-text"
    }`;

  return (
    <OnboardingProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar xPending={xPending} igPending={igPending} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-bg/80 px-3 backdrop-blur-lg sm:h-16 sm:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <button
                className="rounded-lg p-1.5 text-text md:hidden shrink-0 hover:bg-surface-2 transition-colors cursor-pointer"
                aria-label="Open navigation menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
              <span className="text-sm font-bold text-text md:hidden truncate">Undercut</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CreditWidget onTopUp={() => setTopUpOpen(true)} />
            </div>
          </header>

          <MobileTabBar xPending={xPending} igPending={igPending} />

          <main className="flex-1 px-3 pb-24 pt-3 sm:px-4 sm:pt-5 md:px-6 md:pb-8 md:pt-8">
            <div className="mx-auto max-w-5xl">
              <LowBalanceBanner
                visible={lowBalance}
                onTopUp={() => setTopUpOpen(true)}
              />
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                key="drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
              />
              <motion.aside
                key="drawer-panel"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl md:hidden"
              >
                {/* Drawer Header */}
                <div className="flex h-14 items-center justify-between border-b border-border px-4">
                  <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                    <Logo />
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text cursor-pointer transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Drawer Navigation Links */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                  <div>
                    <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Platforms
                    </p>
                    <div className="space-y-1">
                      <Link
                        href="/dashboard/x"
                        onClick={() => setMobileMenuOpen(false)}
                        className={navItemClass(pathname === "/dashboard/x")}
                      >
                        <XIcon style={{ fontSize: 16 }} />
                        <span className="flex-1">X (Twitter)</span>
                        {xPending > 0 && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                            {xPending}
                          </span>
                        )}
                      </Link>
                      <Link
                        href="/dashboard/instagram"
                        onClick={() => setMobileMenuOpen(false)}
                        className={navItemClass(pathname === "/dashboard/instagram")}
                      >
                        <InstagramIcon style={{ fontSize: 16 }} />
                        <span className="flex-1">Instagram</span>
                        {igPending > 0 && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                            {igPending}
                          </span>
                        )}
                      </Link>
                    </div>
                  </div>

                  <div>
                    <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Account
                    </p>
                    <div className="space-y-1">
                      <Link
                        href="/billing"
                        onClick={() => setMobileMenuOpen(false)}
                        className={navItemClass(pathname === "/billing")}
                      >
                        <CreditCard size={16} />
                        <span className="flex-1">Billing</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className={navItemClass(pathname === "/profile")}
                      >
                        <User size={16} />
                        <span className="flex-1">App Profile</span>
                      </Link>
                    </div>
                  </div>
                </nav>

                {/* Drawer Footer Actions */}
                <div className="border-t border-border p-3 space-y-1">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={navItemClass(false)}
                  >
                    <Home size={16} />
                    <span className="flex-1">Back to landing page</span>
                  </Link>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      await signOut({ callbackUrl: "/" });
                    }}
                    className={`${navItemClass(false)} w-full text-left cursor-pointer`}
                  >
                    <LogOut size={16} />
                    <span className="flex-1">Sign out</span>
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
      </div>
    </OnboardingProvider>
  );
}