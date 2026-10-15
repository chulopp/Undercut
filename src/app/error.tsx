"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <div className="rounded-full bg-danger/10 p-3 text-danger mb-4">
        <AlertTriangle size={32} />
      </div>
      <h1 className="text-2xl font-bold text-text">An unexpected error occurred</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        We apologize for the inconvenience. Please try refreshing or return to the home page.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()} variant="primary">
          <RefreshCw size={14} /> Try again
        </Button>
        <Link href="/">
          <Button variant="ghost">
            <Home size={14} /> Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
