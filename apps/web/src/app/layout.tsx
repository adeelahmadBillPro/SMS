import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  title: "ShopOS",
  description: "Offline-first inventory, billing & forecasting for Pakistani retail.",
  applicationName: "ShopOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ShopOS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F172A" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <PostHogProvider />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
