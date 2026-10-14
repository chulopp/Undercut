"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GitCompare, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { getProfile, saveProfile, type Profile } from "@/lib/data";

export function DifferentiatorPanel() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [diffs, setDiffs] = useState(["", "", ""]);
  const toast = useToast();

  useEffect(() => {
    getProfile()
      .then((p) => {
        setProfile(p);
        const diffObj = p?.differentiators || ({} as Record<string, string>);
        setDiffs([
          diffObj.differentiator_1 || "",
          diffObj.differentiator_2 || "",
          diffObj.differentiator_3 || "",
        ]);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[DifferentiatorPanel] Failed to load profile:", err);
        setDiffs(["", "", ""]);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setEditing(false);
    await saveProfile({
      ...profile,
      differentiators: {
        differentiator_1: diffs[0] || "",
        differentiator_2: diffs[1] || "",
        differentiator_3: diffs[2] || "",
      },
    });
    toast.success("Differentiators updated");
    const fresh = await getProfile();
    setProfile(fresh);
  };

  const hasAnyDiff = diffs.some((d) => d && d.trim().length > 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-2 px-5 py-4 text-left cursor-pointer"
      >
        <GitCompare size={16} className="text-accent" />
        <h2 className="flex-1 text-sm font-bold text-text">
          Your differentiators vs competitors
        </h2>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={16} className="text-muted" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3 sm:px-5 sm:py-4">
              {loading ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : editing ? (
                <div className="space-y-3">
                  {diffs.map((d, i) => (
                    <Input
                      key={i}
                      value={d}
                      onChange={(e) =>
                        setDiffs((p) => {
                          const next = [...p];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      placeholder={`Key differentiator ${i + 1} (e.g., 10x faster, free migration)`}
                    />
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSave} className="cursor-pointer">
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : hasAnyDiff ? (
                <div>
                  <ol className="space-y-2">
                    {diffs
                      .filter((d) => d && d.trim().length > 0)
                      .map((d, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                            {i + 1}
                          </span>
                          <span className="text-sm text-text">{d}</span>
                        </li>
                      ))}
                  </ol>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-4 text-xs font-medium text-accent hover:underline cursor-pointer"
                  >
                    Edit differentiators
                  </button>
                </div>
              ) : (
                <div className="py-1">
                  <p className="text-sm text-muted leading-relaxed">
                    No differentiators set yet. Add your product's unique value props so AI can highlight them when replying to competitor complaints.
                  </p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 cursor-pointer"
                  >
                    <Plus size={13} /> Add Differentiators
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}