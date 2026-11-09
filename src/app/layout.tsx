import type { Metadata, Viewport } from "next";
import { ConfirmHost, Toaster } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:9000"),
  title: { default: "HotteList — listes de Noël en famille", template: "%s · HotteList" },
  description: "Les listes de cadeaux de toute la famille, sans gâcher la surprise.",
  robots: { index: false, follow: false },
  openGraph: { siteName: "HotteList", locale: "fr_FR", type: "website" },
  appleWebApp: { capable: true, title: "HotteList", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#7E1621" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster />
        <ConfirmHost />
      </body>
    </html>
  );
}
