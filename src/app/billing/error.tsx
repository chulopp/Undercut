"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Billing Error Boundary]:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-danger/10 p-3 text-danger mb-4">
        <AlertTriangle size={28} />
      </div>
      <h2 className="text-xl font-bold text-text">Failed to load billing</h2>
      <p className="mt-2 text-sm text-muted">
        We encountered an error loading your billing information. Please try reloading or head back to the dashboard.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()} variant="primary">
          <RefreshCw size={14} /> Try again
        </Button>
        <Link href="/dashboard/x">
          <Button variant="ghost">
            <ArrowLeft size={14} /> Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
