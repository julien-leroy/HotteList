import type { NextConfig } from "next";

// En mode développement (`npm run dev`), Next.js refuse de servir son JavaScript
// à un autre nom que localhost : la page s'affiche mais aucun bouton ne marche.
// On autorise donc le domaine de APP_URL. En production (`npm start`), rien à faire.
const appHost = (() => {
  try {
    return new URL(process.env.APP_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Les images sont affichées directement depuis le site d'origine : pas d'optimisation côté serveur.
  images: { unoptimized: true },
  // Export PDF / Excel : bibliothèques Node laissées hors du bundle (pdfkit lit ses fichiers de polices)
  serverExternalPackages: ["pdfkit", "exceljs"],
  allowedDevOrigins: appHost && appHost !== "localhost" ? [appHost] : [],
};

export default nextConfig;
