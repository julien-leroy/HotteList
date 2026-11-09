import type { MetadataRoute } from "next";

// Rend HotteList installable sur l'écran d'accueil (Android, ordinateur ; iOS via « Sur l'écran d'accueil »).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HotteList — listes de Noël en famille",
    short_name: "HotteList",
    description: "Les listes de cadeaux de toute la famille, sans gâcher la surprise.",
    start_url: "/familles",
    scope: "/",
    display: "standalone",
    background_color: "#F7F1E3",
    theme_color: "#7E1621",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ma liste de courses", url: "/courses" },
      { name: "Mon profil", url: "/profil" },
    ],
  };
}
