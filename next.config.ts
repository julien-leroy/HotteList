import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Les images sont affichées directement depuis le site d'origine : pas d'optimisation côté serveur.
  images: { unoptimized: true },
};

export default nextConfig;
