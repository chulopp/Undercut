"use client";

import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useAuthModal } from "@/components/AuthModalProvider";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const QUICK_LINKS = [
  { label: "How it Works", href: "/#how" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function Footer() {
  const router = useRouter();
  const { data: session } = useSession();
  const { open } = useAuthModal();
  const user = session?.user;

  const handleStartFree = () => {
    if (user) {
      router.push("/dashboard/x");
    } else {
      open();
    }
  };

  return (
    <footer className="border-t border-border bg-surface/30">
      <Container className="py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.8fr] items-start">
          {/* Left: Branding */}
          <div className="flex flex-col items-center sm:items-start">
            <Logo />
            <p className="mt-3 max-w-xs text-center text-sm text-muted sm:text-left">
              Turn competitor complaints into your next customers. AI drafts, you send.
            </p>
          </div>

          {/* Center: Quick Links */}
          <div className="flex flex-col items-start lg:pl-0">
            <span className="font-bold text-text text-xs uppercase tracking-wider mb-3 select-none">
              Quick Links
            </span>
            <nav className="flex flex-col items-start gap-2 text-sm">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-muted transition-colors hover:text-text font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Legal & CTA Button */}
          <div className="flex flex-col items-center sm:items-end gap-5">
            <div className="flex items-center gap-3 text-xs font-medium">
              <a
                href="/terms"
                className="text-muted transition-colors hover:text-text"
              >
                Terms of Service
              </a>
              <span className="text-border/60">|</span>
              <a
                href="/privacy"
                className="text-muted transition-colors hover:text-text"
              >
                Privacy Policy
              </a>
            </div>
            <div>
              <Button size="md" onClick={handleStartFree} className="w-full sm:w-auto">
                Start Free — No Card Needed
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom: Copyright */}
        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} Undercut. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}