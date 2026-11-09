"use client";

import { toast } from "./toaster";

/** Partage natif (WhatsApp, SMS…) sur téléphone ; sinon copie un message tout prêt. */
export function ShareButton({ url, familyName }: { url: string; familyName: string }) {
  const text = `Rejoins « ${familyName} » sur HotteList pour partager nos listes de Noël :`;
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "HotteList", text, url });
      } catch {
        /* partage annulé */
      }
      return;
    }
    const message = `${text} ${url}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(message);
      ok = true;
    } catch {
      // Repli pour les navigateurs sans presse-papiers moderne
      const t = document.createElement("textarea");
      t.value = message;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      ok = document.execCommand("copy");
      t.remove();
    }
    if (ok) toast("Message d'invitation copié : collez-le dans WhatsApp, un SMS ou un e-mail.");
    else toast("Impossible de copier automatiquement. Copiez le lien ci-dessus.", true);
  }
  return (
    <button type="button" className="btn b-light" onClick={share} style={{ minHeight: 40 }}>
      Partager l&apos;invitation
    </button>
  );
}
