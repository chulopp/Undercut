"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  push: (variant: ToastVariant, message: string) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  warning: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error: <XCircle size={18} className="text-danger" />,
  warning: <AlertTriangle size={18} className="text-warning" />,
  info: <Info size={18} className="text-accent" />,
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      setToasts((prev) => {
        // Prevent duplicate toasts with identical content from stacking
        if (prev.some((t) => t.message === message && t.variant === variant)) {
          return prev;
        }
        const id = Math.random().toString(36).slice(2, 9);
        setTimeout(() => dismiss(id), 4000);
        return [...prev, { id, variant, message }];
      });
    },
    [dismiss]
  );

  const success = useCallback((m: string) => push("success", m), [push]);
  const error = useCallback((m: string) => push("error", m), [push]);
  const warning = useCallback((m: string) => push("warning", m), [push]);
  const info = useCallback((m: string) => push("info", m), [push]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success,
      error,
      warning,
      info,
    }),
    [push, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Mobile: pinned left-4 and right-4 with calc width; Desktop: bottom-right max-w-sm */}
      <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-[300] flex flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur-md"
            >
              <div className="mt-0.5 shrink-0">{ICONS[t.variant]}</div>
              <p className="flex-1 text-sm text-text leading-snug break-words">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}