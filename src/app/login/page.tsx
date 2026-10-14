"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard/x");
    } else if (status === "unauthenticated") {
      router.push("/?auth=required");
    }
  }, [router, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span className="text-sm font-medium">Redirecting...</span>
      </div>
    </div>
  );
}
