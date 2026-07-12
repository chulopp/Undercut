"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, History, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  createTopUp,
  getBillingStatus,
  listLedger,
  listTransactions,
  type BillingStatus,
} from "@/lib/data";
import type { BillingEntry, Transaction } from "@/lib/types";

const TEMPLATES = [2, 5, 10, 15, 30, 50, 100, 200];
const USD_TO_IDR = 16000;

const STATUS_COLORS = {
  PENDING: "bg-warning/15 text-warning",
  SETTLED: "bg-success/15 text-success",
  FAILED: "bg-danger/15 text-danger",
  EXPIRED: "bg-surface-2 text-muted",
} as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BillingView() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [ledger, setLedger] = useState<BillingEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [customAmount, setCustomAmount] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getBillingStatus().then((s) => {
      setStatus(s);
      setLoadingStatus(false);
    });
    Promise.all([listLedger(), listTransactions()]).then(([l, t]) => {
      setLedger(l);
      setTransactions(t);
      setLoadingHistory(false);
    });
  }, []);

  const handleTopUp = async () => {
    if (customAmount < 2) {
      toast.error("Minimum top-up is $2");
      return;
    }
    setSubmitting(true);
    try {
      await createTopUp(customAmount);
      toast.success(
        `Top up $${customAmount.toFixed(2)} initiated. Redirecting to Midtrans snap…`
      );
    } catch {
      toast.error("Failed to start top-up");
    } finally {
      setSubmitting(false);
    }
  };

  const [weekStart] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const totalSpentThisWeek = ledger
    .filter(
      (e) =>
        (e.transaction_type === "GATE_2_GENERATION_FEE" ||
          e.transaction_type === "FREE_DEMO") &&
        +new Date(e.created_at) > weekStart
    )
    .reduce((sum, e) => sum + Math.abs(e.amount_usd), 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:py-16">
      <Link
        href="/dashboard/x"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-bold text-text">Billing &amp; credits</h1>
        <p className="mt-1 text-sm text-muted">
          Pay-per-use. No subscription. Credits never expire.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Current balance
          </h3>
          {loadingStatus || !status ? (
            <Skeleton className="mt-3 h-12 w-32" />
          ) : (
            <>
              <div className="mt-3 text-4xl font-bold text-text">
                ${status.credit_balance.toFixed(2)}
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted">
                <div className="flex items-center justify-between">
                  <span>Free demo this week</span>
                  <span className="font-semibold text-text">
                    {status.free_demo_credits_remaining}/5
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Replied total</span>
                  <span className="font-semibold text-text">
                    {status.leads_replied_total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Spent this week</span>
                  <span className="font-semibold text-text">
                    ${totalSpentThisWeek.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-accent" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Top up
            </h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMPLATES.map((amt) => (
              <button
                key={amt}
                onClick={() => setCustomAmount(amt)}
                className={`rounded-xl border px-3 py-2.5 text-center transition-colors ${
                  customAmount === amt
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-2 text-text hover:border-accent/40"
                }`}
              >
                <div className="text-base font-bold">${amt}</div>
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-muted">
              Custom amount (min $2)
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-muted">$</span>
              <Input
                type="number"
                min={2}
                value={customAmount}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                className="flex-1"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2 rounded-xl border border-border bg-surface-2 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Cycles granted</span>
              <span className="font-semibold text-text">
                {Math.floor(customAmount / 0.1)} replies
              </span>
            </div>
          </div>

          <Button
            onClick={handleTopUp}
            disabled={submitting}
            className="mt-4 w-full sm:w-auto"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <CreditCard size={16} /> Pay ${customAmount.toFixed(2)}
              </>
            )}
          </Button>

          <p className="mt-3 text-[11px] text-muted">
            Methods: Credit/Debit Card · Apple Pay · Google Pay · Link
          </p>
        </Card>
      </div>

      <section className="mt-12">
        <div className="flex items-center gap-2">
          <History size={16} className="text-accent" />
          <h2 className="text-base font-bold text-text">Transaction history</h2>
        </div>

        {loadingHistory ? (
          <div className="mt-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="bg-surface/40">
                    <td className="px-4 py-3 text-muted">
                      {formatTime(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 text-text">
                      Top up ${tx.top_up_amount_usd.toFixed(2)} · +${tx.credit_granted_usd.toFixed(2)} credit
                    </td>
                    <td className="px-4 py-3 text-text">
                      ${tx.top_up_amount_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_COLORS[tx.status]
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {ledger
                  .filter((e) => e.transaction_type !== "TOPUP")
                  .map((e) => (
                    <tr key={e.id} className="bg-surface/40">
                      <td className="px-4 py-3 text-muted">
                        {formatTime(e.created_at)}
                      </td>
                      <td className="px-4 py-3 text-text">
                        {e.transaction_type === "FREE_DEMO"
                          ? "Free weekly demo used"
                          : e.transaction_type === "GATE_2_GENERATION_FEE"
                            ? "Reply draft fee"
                            : e.transaction_type === "REFUND"
                              ? "Refund"
                              : e.transaction_type}
                      </td>
                      <td className="px-4 py-3 text-text">
                        {e.amount_usd < 0
                          ? `-$${Math.abs(e.amount_usd).toFixed(2)}`
                          : "$0.00"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                          SETTLED
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}