"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-danger/10 p-3 text-danger mb-4">
        <AlertTriangle size={28} />
      </div>
      <h2 className="text-xl font-bold text-text">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">
        We encountered an error loading this dashboard view. Please try reloading or refresh the page.
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
