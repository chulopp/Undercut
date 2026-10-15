"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LowBalanceBanner({
  visible,
  onTopUp,
}: {
  visible: boolean;
  onTopUp: () => void;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 mx-auto mb-6 flex max-w-3xl flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} className="shrink-0 text-warning" />
        <p className="text-sm text-text">
          Your token balance is running low or depleted. Please top up to continue generating replies.
        </p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <Button size="sm" variant="primary" onClick={onTopUp} className="h-8 text-xs cursor-pointer">
          Top Up Now
        </Button>
      </div>
    </motion.div>
  );
}