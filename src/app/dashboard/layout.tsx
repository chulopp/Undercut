"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { CreditWidget } from "@/components/dashboard/CreditWidget";
import { TopUpModal } from "@/components/dashboard/TopUpModal";
import { LowBalanceBanner } from "@/components/dashboard/LowBalanceBanner";
import { useEffect } from "react";
import { listLeads, getBillingStatus } from "@/lib/data";
import { useToast } from "@/components/ui/Toast";

export default function DashboardLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [xPending, setXPending] = useState(0);
  const [igPending, setIgPending] = useState(0);
  const [lowBalance, setLowBalance] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const payment = params.get("payment");
      const amount = params.get("amount");
      if (payment === "success") {
        const val = amount ? parseFloat(amount) : 0;
        if (val > 0) {
          toast.success(`Top-up of $${val.toFixed(2)} was successful!`);
        } else {
          toast.success("Top-up was successful!");
        }
        // Force credit widget to update
        window.dispatchEvent(new CustomEvent("billing-updated"));
        // Clean URL query parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else if (payment === "cancelled") {
        toast.error("Top-up was cancelled.");
        // Clean URL query parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [toast]);

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

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar xPending={xPending} igPending={igPending} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg/80 px-4 backdrop-blur-lg sm:px-6">
          <button
            className="rounded-lg p-2 text-text md:hidden"
            aria-label="Menu"
            onClick={() => router.push("/dashboard")}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-sm font-bold text-text">Undercut</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditWidget onTopUp={() => setTopUpOpen(true)} />
          </div>
        </header>

        <MobileTabBar xPending={xPending} igPending={igPending} />

        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 md:pb-8 md:pt-8">
          <div className="mx-auto max-w-5xl">
            <LowBalanceBanner
              visible={lowBalance}
              onTopUp={() => setTopUpOpen(true)}
            />
            {children}
          </div>
        </main>
      </div>

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
}