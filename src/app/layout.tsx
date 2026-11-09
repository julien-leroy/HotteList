import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "HotteList — listes de Noël en famille", template: "%s · HotteList" },
  description: "Les listes de cadeaux de toute la famille, sans gâcher la surprise.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#7E1621" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
