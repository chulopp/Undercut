"use client";

import { useEffect, useState } from "react";
import { Wallet, Gift } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBillingStatus, type BillingStatus } from "@/lib/data";

export function CreditWidget({ onTopUp }: { onTopUp: () => void }) {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const reload = () => {
      getBillingStatus().then((s) => {
        if (mounted) {
          setStatus(s);
          setLoading(false);
        }
      });
    };
    reload();
    window.addEventListener("billing-updated", reload);
    return () => {
      mounted = false;
      window.removeEventListener("billing-updated", reload);
    };
  }, []);

  if (loading || !status) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-[38px] w-24 rounded-xl" />
        <Skeleton className="h-[38px] w-24 rounded-xl" />
        <Skeleton className="h-[38px] w-20 rounded-xl" />
      </div>
    );
  }

  const lowBalance =
    status.free_demo_credits_remaining === 0 && status.credit_balance < 0.1;

  return (
    <div className="flex items-center gap-3">
      {/* Credit Balance 3D Box */}
      <div className="flex items-center gap-2 rounded-xl border border-border border-b-[3.5px] border-b-accent/50 bg-surface px-3 py-1.5 shadow-lg h-[38px] justify-center min-w-[105px]">
        <Wallet size={15} className="text-accent shrink-0" />
        <span className="text-sm font-bold text-text leading-none">
          ${status.credit_balance.toFixed(2)}
        </span>
      </div>

      {/* Free Demo Credits 3D Box */}
      <div className="flex items-center gap-2 rounded-xl border border-border border-b-[3.5px] border-b-warning/50 bg-surface px-3 py-1.5 shadow-lg h-[38px] justify-center min-w-[105px]">
        <Gift size={15} className="text-warning shrink-0" />
        <span className="text-sm font-bold text-text leading-none">
          {status.free_demo_credits_remaining}/5 free
        </span>
      </div>

      {/* 3D Blue Button */}
      <Button size="sm" variant="primary" onClick={onTopUp} className="h-[38px]">
        {lowBalance ? "Top Up →" : "Top Up"}
      </Button>
    </div>
  );
}