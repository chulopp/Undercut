"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const TEMPLATES = [
  { amount: 2, label: "$2", cycles: "20" },
  { amount: 5, label: "$5", cycles: "50" },
  { amount: 10, label: "$10", cycles: "100" },
  { amount: 15, label: "$15", cycles: "150" },
  { amount: 30, label: "$30", cycles: "300" },
  { amount: 50, label: "$50", cycles: "500" },
  { amount: 100, label: "$100", cycles: "1000" },
  { amount: 200, label: "$200", cycles: "2000" },
];

export function TopUpModal({
  open,
  onClose,
  preselectAmount,
}: {
  open: boolean;
  onClose: () => void;
  preselectAmount?: number;
}) {
  const [amount, setAmount] = useState<number>(preselectAmount ?? 10);
  const toast = useToast();

  const handleConfirm = () => {
    toast.warning(
      "Fitur Top-Up saat ini dinonaktifkan (Mode Portofolio Demo). Gunakan free tokens yang telah disediakan."
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Top up credits"
        >
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-text">
              <CreditCard size={18} className="text-accent" />
              <h2 className="text-lg font-bold">Top up credits</h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Pay per reply draft. No subscription. Credits never expire.
            </p>

            {/* Portfolio Mode Warning Banner */}
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-left text-xs text-warning">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={15} className="shrink-0 text-warning" />
                <span>Mode Portofolio / Pemeliharaan</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-text/80">
                Integrasi pembayaran Stripe dinonaktifkan untuk demonstrasi portofolio.
                Anda tetap dapat menguji antarmuka pilihan nominal di bawah ini.
              </p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Quick templates
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.amount}
                    onClick={() => setAmount(t.amount)}
                    className={`rounded-xl border px-2 py-2.5 text-center transition-colors cursor-pointer ${
                      amount === t.amount
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border bg-surface-2 text-text hover:border-accent/40"
                    }`}
                  >
                    <div className="text-sm font-bold">{t.label}</div>
                    <div className="text-[10px] text-muted">{t.cycles} cycles</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Custom amount (min $2)
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-muted font-mono">$</span>
                <Input
                  type="number"
                  min={2}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Cycles granted</span>
                <span className="font-semibold text-text">
                  {Math.floor(amount / 0.1)} replies
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button
                onClick={handleConfirm}
                disabled={amount < 2}
                className="flex-1 cursor-pointer"
              >
                <CreditCard size={16} /> Pay ${amount.toFixed(2)} (Demo Offline)
              </Button>
            </div>

            <div className="mt-3 text-center text-[10px] text-muted">
              Credit/Debit Card · Apple Pay · Google Pay · Link
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}