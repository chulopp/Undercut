import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AuthModalProvider } from "@/components/AuthModalProvider";
import { AuthModal } from "@/components/AuthModal";
import { ToastProvider } from "@/components/ui/Toast";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://undercut.app"),
  title: "Undercut — Turn competitor complaints into your next customers",
  description:
    "Undercut watches X and Instagram for people complaining about your competitors — AI drafts the reply, you just hit send.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Undercut — Turn competitor complaints into your next customers",
    description:
      "Undercut watches X and Instagram for people complaining about your competitors — AI drafts the reply, you just hit send.",
    type: "website",
    locale: "en_US",
  },
  verification: {
    google: "RDqO8MqGIMaagmt5eb9vQIkZEij4VzXLoowTNeV_2VY",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F11",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${playfair.variable} dark`}>
      <body className="min-h-screen bg-bg text-text antialiased">
        <AuthModalProvider>
          <ToastProvider>
            {children}
            <AuthModal />
          </ToastProvider>
        </AuthModalProvider>
      </body>
    </html>
  );
}