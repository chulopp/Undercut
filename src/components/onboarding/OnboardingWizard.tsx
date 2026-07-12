"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { TonePreview } from "@/components/onboarding/TonePreview";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { getProfile, saveProfile, type ProfileInput } from "@/lib/data";
import type { ToneOfVoice, Differentiators } from "@/lib/types";

const INITIAL: ProfileInput = {
  app_name: "",
  app_description: "",
  app_url: "",
  app_category: "",
  target_audience: "",
  tone_of_voice: "friendly",
  differentiators: {
    differentiator_1: "",
    differentiator_2: "",
    differentiator_3: "",
  },
  company_name: null,
};

const CATEGORIES = [
  "Productivity",
  "FinTech",
  "Social",
  "Health & Fitness",
  "eCommerce",
  "Developer Tools",
  "Education",
  "Entertainment",
  "SaaS",
  "AI & Machine Learning",
  "Design & Creative",
  "Marketing",
  "Travel",
  "Other",
];

const TONES: { tone: ToneOfVoice; emoji: string; sample: string }[] = [
  { tone: "professional", emoji: "💼", sample: "Apologies for the disruption…" },
  { tone: "friendly", emoji: "🙌", sample: "Ouch, that's rough 🙌" },
  { tone: "casual", emoji: "💬", sample: "man that sucks…" },
  { tone: "playful", emoji: "🎭", sample: "eats gremlins for breakfast 😅" },
];

function isValidUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const hasProtocol = /^[a-z]+:\/\//i.test(trimmed);
    const urlToTest = hasProtocol ? trimmed : `http://${trimmed}`;
    const parsed = new URL(urlToTest);
    return parsed.hostname.includes('.') && parsed.hostname.length > 3;
  } catch {
    return false;
  }
}

function CategoryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedList = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const handleToggle = (cat: string) => {
    let nextList: string[];
    if (selectedList.includes(cat)) {
      nextList = selectedList.filter((x) => x !== cat);
    } else {
      nextList = [...selectedList, cat];
    }
    onChange(nextList.join(", "));
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-left text-sm text-text transition-colors hover:border-accent/40 focus:border-accent"
      >
        <span className="truncate">
          {selectedList.length > 0
            ? selectedList.join(", ")
            : "Select categories (multi-select)..."}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-[110] mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-surface-2 p-2 shadow-2xl">
          <div className="grid grid-cols-1 gap-1">
            {CATEGORIES.map((c) => {
              const isChecked = selectedList.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleToggle(c)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-3 ${
                    isChecked ? "bg-accent/5 font-semibold text-accent" : "text-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="h-4 w-4 rounded border-border bg-transparent text-accent focus:ring-accent"
                  />
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingWizard({
  initial,
}: {
  initial?: ProfileInput & { onboarding_completed?: boolean };
}) {
  const isEdit = !!initial?.onboarding_completed;
  const [step, setStep] = useState(isEdit ? 0 : 1);
  const [form, setForm] = useState<ProfileInput>(
    initial
      ? { ...INITIAL, ...initial, company_name: initial.company_name ?? null }
      : INITIAL
  );
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  // Handle multi-differentiators dynamically
  const [diffs, setDiffs] = useState<string[]>(() => {
    const dObj = initial?.differentiators || INITIAL.differentiators || {};
    const keys = Object.keys(dObj).filter((k) => k.startsWith("differentiator_"));
    if (keys.length > 0) {
      const list = keys
        .sort((a, b) => {
          const numA = parseInt(a.split("_")[1]) || 0;
          const numB = parseInt(b.split("_")[1]) || 0;
          return numA - numB;
        })
        .map((k) => dObj[k])
        .filter((v) => typeof v === "string");
      return list.length > 0 ? list : ["", "", ""];
    }
    return ["", "", ""];
  });

  const handleDiffChange = (index: number, val: string) => {
    const nextDiffs = [...diffs];
    nextDiffs[index] = val;
    setDiffs(nextDiffs);

    const diffsObj: Differentiators = {
      differentiator_1: nextDiffs[0] || "",
      differentiator_2: nextDiffs[1] || "",
      differentiator_3: nextDiffs[2] || "",
    };
    nextDiffs.forEach((v, i) => {
      if (i >= 3) {
        diffsObj[`differentiator_${i + 1}`] = v;
      }
    });
    setForm((p) => ({ ...p, differentiators: diffsObj }));
  };

  const handleAddDiff = () => {
    if (diffs.length >= 10) return;
    const nextDiffs = [...diffs, ""];
    setDiffs(nextDiffs);

    const diffsObj: Differentiators = {
      differentiator_1: nextDiffs[0] || "",
      differentiator_2: nextDiffs[1] || "",
      differentiator_3: nextDiffs[2] || "",
    };
    nextDiffs.forEach((v, i) => {
      if (i >= 3) {
        diffsObj[`differentiator_${i + 1}`] = v;
      }
    });
    setForm((p) => ({ ...p, differentiators: diffsObj }));
  };

  const handleRemoveDiff = (index: number) => {
    if (diffs.length <= 1) return;
    const nextDiffs = diffs.filter((_, i) => i !== index);
    setDiffs(nextDiffs);

    const diffsObj: Differentiators = {
      differentiator_1: nextDiffs[0] || "",
      differentiator_2: nextDiffs[1] || "",
      differentiator_3: nextDiffs[2] || "",
    };
    nextDiffs.forEach((v, i) => {
      if (i >= 3) {
        diffsObj[`differentiator_${i + 1}`] = v;
      }
    });
    setForm((p) => ({ ...p, differentiators: diffsObj }));
  };

  useEffect(() => {
    if (!initial) {
      getProfile().then((p) => {
        if (p.onboarding_completed) {
          setForm({
            app_name: p.app_name,
            app_description: p.app_description,
            app_url: p.app_url,
            app_category: p.app_category,
            target_audience: p.target_audience,
            tone_of_voice: p.tone_of_voice,
            differentiators: p.differentiators,
            company_name: p.company_name,
          });
        }
      });
    }
  }, [initial]);

  const update = (k: keyof ProfileInput, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const canProceed = () => {
    if (step === 1)
      return (
        form.app_name.trim() &&
        form.app_description.trim() &&
        isValidUrl(form.app_url)
      );
    if (step === 2)
      return form.app_category.trim() && form.target_audience.trim();
    if (step === 3)
      return diffs.some((d) => d.trim().length > 0);
    return false;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      toast.success("Profile saved — welcome aboard!");
      router.push("/dashboard/x");
    } catch {
      toast.error("Couldn't save profile");
      setSaving(false);
    }
  };

  const stepHeader = isEdit ? (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-bold text-text">Edit app profile</h1>
      <p className="mt-2 text-sm text-muted">
        Update anytime. New AI replies will use the latest context.
      </p>
    </div>
  ) : (
    <div className="mb-8 text-center">
      <h1 className="text-2xl font-bold text-text">Set up your app profile</h1>
      <p className="mt-2 text-sm text-muted">
        AI uses this context to draft personalized replies that sound like
        you, not a bot.
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      {/* Undercut Logo placed in the center */}
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      {stepHeader}

      {!isEdit && (
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1">
              <motion.div
                animate={{
                  width: step >= n ? "100%" : "0%",
                }}
                transition={{ duration: 0.4 }}
                className="h-1 rounded-full bg-accent"
              />
            </div>
          ))}
        </div>
      )}

      {isEdit && (
        <div className="mb-8">
          <div className="grid gap-6">
            <Step1Fields form={form} update={update} />
            <Step2Fields form={form} update={update} />
            <Step3Fields
              diffs={diffs}
              onDiffChange={handleDiffChange}
              onAddDiff={handleAddDiff}
              onRemoveDiff={handleRemoveDiff}
            />
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="mb-4 text-sm font-bold text-text">✨ Live Tone Preview</h3>
              <TonePreview
                tone={form.tone_of_voice}
                appName={form.app_name || "MyApp"}
                differentiator={diffs[0] || ""}
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <Button onClick={handleFinish} disabled={saving} size="lg">
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} /> Save changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {!isEdit && (
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="s1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold text-text">App basics</h2>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  App name *
                </label>
                <Input
                  value={form.app_name}
                  onChange={(e) => update("app_name", e.target.value)}
                  placeholder="MyApp"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  App description *
                </label>
                <Textarea
                  value={form.app_description}
                  onChange={(e) => update("app_description", e.target.value)}
                  rows={3}
                  placeholder="What does it do, what problem does it solve (2-3 sentences)."
                  className="mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  App URL *
                </label>
                <Input
                  value={form.app_url}
                  onChange={(e) => update("app_url", e.target.value)}
                  placeholder="https://myapp.io or app link"
                  className={`mt-2 ${
                    form.app_url && !isValidUrl(form.app_url)
                      ? "border-danger focus-visible:ring-danger"
                      : ""
                  }`}
                />
                {form.app_url && !isValidUrl(form.app_url) && (
                  <p className="mt-1.5 text-xs text-danger">
                    Please enter a valid website URL or app link.
                  </p>
                )}
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="s2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-bold text-text">Audience</h2>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted mb-2">
                  Category (Multi-select dropdown) *
                </label>
                <CategoryDropdown
                  value={form.app_category}
                  onChange={(val) => update("app_category", val)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Target audience *
                </label>
                <Textarea
                  value={form.target_audience}
                  onChange={(e) => update("target_audience", e.target.value)}
                  rows={3}
                  placeholder="Who uses your app? Be specific — indie devs, writers, students…"
                  className="mt-2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Company name (optional)
                </label>
                <Input
                  value={form.company_name ?? ""}
                  onChange={(e) => update("company_name", e.target.value || null)}
                  placeholder="Solo Studio"
                  className="mt-2"
                />
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="s3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-bold text-text">Tone & USP</h2>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Tone of voice
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TONES.map((t) => (
                    <button
                      key={t.tone}
                      onClick={() => update("tone_of_voice", t.tone)}
                      className={`rounded-xl border px-3 py-3 text-center transition-colors ${
                        form.tone_of_voice === t.tone
                          ? "border-accent bg-accent/10"
                          : "border-border bg-surface hover:border-accent/40"
                      }`}
                    >
                      <div className="text-xl">{t.emoji}</div>
                      <div className="mt-1 text-xs font-semibold capitalize text-text">
                        {t.tone}
                      </div>
                      <div className="text-[10px] text-muted">{t.sample}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                    Your Differentiators (USP) *
                  </label>
                  <span className="text-[10px] text-muted font-mono bg-surface px-2 py-0.5 rounded-full border border-border">
                    {diffs.length}/10 max
                  </span>
                </div>

                <p className="text-xs text-muted/95 leading-relaxed bg-[#111114] p-3.5 rounded-xl border border-border">
                  <strong>What is a differentiator?</strong> A differentiator (or USP) is a unique feature, benefit, or pricing advantage that sets your app apart from competitors (e.g., <em>&quot;Offline-first sync&quot;</em>, <em>&quot;SLA response under 2 hours&quot;</em>, or <em>&quot;No credit card required&quot;</em>). The AI uses these key facts to draft highly personalized replies that showcase your product's unique value.
                </p>

                <div className="space-y-2">
                  {diffs.map((val, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={val}
                        onChange={(e) => handleDiffChange(idx, e.target.value)}
                        placeholder={`Differentiator ${idx + 1} (e.g., Offline-first sync)`}
                        className="flex-1"
                      />
                      {diffs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDiff(idx)}
                          className="rounded-lg p-2.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {diffs.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddDiff}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[#111114] px-3 py-1.5 text-xs text-muted hover:text-text hover:bg-surface transition-colors"
                  >
                    + Add differentiator
                  </button>
                )}
              </div>

              <div className="mt-4 border-t border-border/40 pt-4">
                <p className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-accent">
                  ✨ Live Tone Preview
                </p>
                <TonePreview
                  tone={form.tone_of_voice}
                  appName={form.app_name}
                  differentiator={diffs[0] || ""}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      )}

      {!isEdit && (
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft size={16} /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving || !canProceed()}>
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Check size={16} /> Finish & start monitoring
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Step1Fields({
  form,
  update,
}: {
  form: ProfileInput;
  update: (k: keyof ProfileInput, v: unknown) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-bold text-text mb-4">App basics</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            App Name *
          </label>
          <Input
            value={form.app_name}
            onChange={(e) => update("app_name", e.target.value)}
            placeholder="App name"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            App Description *
          </label>
          <Textarea
            value={form.app_description}
            onChange={(e) => update("app_description", e.target.value)}
            rows={3}
            placeholder="App description"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            App URL *
          </label>
          <Input
            value={form.app_url}
            onChange={(e) => update("app_url", e.target.value)}
            placeholder="https://myapp.io or app link"
            className={
              form.app_url && !isValidUrl(form.app_url)
                ? "border-danger focus-visible:ring-danger"
                : ""
            }
          />
          {form.app_url && !isValidUrl(form.app_url) && (
            <p className="mt-1 text-xs text-danger">
              Please enter a valid website URL or app link.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Step2Fields({
  form,
  update,
}: {
  form: ProfileInput;
  update: (k: keyof ProfileInput, v: unknown) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-bold text-text mb-4">Audience</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            Category (Multi-select dropdown) *
          </label>
          <CategoryDropdown
            value={form.app_category}
            onChange={(val) => update("app_category", val)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            Target Audience *
          </label>
          <Textarea
            value={form.target_audience}
            onChange={(e) => update("target_audience", e.target.value)}
            rows={2}
            placeholder="Target audience description"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
            Company name (optional)
          </label>
          <Input
            value={form.company_name ?? ""}
            onChange={(e) => update("company_name", e.target.value || null)}
            placeholder="Company name"
          />
        </div>
      </div>
    </section>
  );
}

function Step3Fields({
  diffs,
  onDiffChange,
  onAddDiff,
  onRemoveDiff,
}: {
  diffs: string[];
  onDiffChange: (index: number, val: string) => void;
  onAddDiff: () => void;
  onRemoveDiff: (index: number) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-text">Differentiators (USP)</h3>
        <span className="text-[10px] text-muted font-mono bg-[#111114] px-2 py-0.5 rounded-full border border-border">
          {diffs.length}/10 max
        </span>
      </div>
      <p className="text-xs text-muted leading-relaxed mb-4">
        A differentiator (USP) is a unique feature, benefit, or pricing advantage that sets your app apart from competitors (e.g. <em>&quot;Offline-first sync&quot;</em>).
      </p>
      <div className="space-y-2.5">
        {diffs.map((val, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input
              value={val}
              onChange={(e) => onDiffChange(idx, e.target.value)}
              placeholder={`Differentiator ${idx + 1}`}
              className="flex-1"
            />
            {diffs.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveDiff(idx)}
                className="rounded-lg p-2.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {diffs.length < 10 && (
        <button
          type="button"
          onClick={onAddDiff}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted hover:text-text hover:bg-surface-3 transition-colors"
        >
          + Add differentiator
        </button>
      )}
    </section>
  );
}