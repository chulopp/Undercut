"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuthModal } from "@/components/AuthModalProvider";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

const NAV_LINKS = [
  { label: "How it Works", href: "/#how" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const { open } = useAuthModal();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen
            ? "border-b border-border bg-bg/95 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Undercut home" className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-text"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/dashboard/x")}
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={open}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" onClick={open}>
                  Start Free
                </Button>
              </>
            )}
          </div>

          <button
            aria-label="Open menu"
            className="rounded-lg p-2 text-text md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-bg md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-text"
              >
                <X size={24} />
              </button>
            </div>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06 } },
              }}
              className="flex flex-col gap-2 px-5 pt-8"
            >
              {NAV_LINKS.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    show: { opacity: 1, x: 0 },
                  }}
                  className="border-b border-border py-4 text-xl font-medium text-text"
                >
                  {link.label}
                </motion.a>
              ))}
              <div className="mt-6 flex flex-col gap-3">
                {user ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/dashboard/x");
                    }}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMenuOpen(false);
                        open();
                      }}
                    >
                      Log In
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setMenuOpen(false);
                        open();
                      }}
                    >
                      Start Free — No Card Needed
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}