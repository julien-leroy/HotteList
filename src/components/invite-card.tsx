"use client";

import { CopyLink, copyText } from "./copy-link";
import { toast } from "./toaster";

/**
 * Juste après la création d'une famille (personne d'autre n'y est encore) : l'invitation en grand,
 * avec de quoi l'envoyer tout de suite (WhatsApp, SMS, e-mail, ou le partage du téléphone).
 */
export function InviteCard({ url, familyName, eventName }: { url: string; familyName: string; eventName: string }) {
  const listes = eventName === "Noël" ? "nos listes de Noël" : `nos listes pour ${eventName}`;
  const text = `Rejoins « ${familyName} » sur HotteList pour partager ${listes} :`;
  const message = `${text} ${url}`;
  const enc = encodeURIComponent;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "HotteList", text, url });
      } catch {
        /* partage annulé */
      }
      return;
    }
    if (await copyText(message)) toast("Message d'invitation copié : collez-le où vous voulez.");
  }

  return (
    <section className="invite-card" aria-labelledby="invite-title">
      <div className="flex flex-col gap-1">
        <h2 id="invite-title" className="font-display m-0 text-[24px] font-bold">
          Invitez votre famille
        </h2>
        <p className="m-0 text-[15px] text-gris">
          Envoyez ce lien à tout le monde : chacun touche son nom ou donne son prénom, et voit les listes.
        </p>
      </div>
      <CopyLink url={url} light={false} />
      <div className="invite-actions">
        <button type="button" className="btn b-primary" onClick={share}>
          Partager l&apos;invitation
        </button>
        <a className="btn b-soft" href={`https://wa.me/?text=${enc(message)}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
        <a className="btn b-soft" href={`sms:?&body=${enc(message)}`}>
          SMS
        </a>
        <a className="btn b-soft" href={`mailto:?subject=${enc(`Rejoins ${familyName} sur HotteList`)}&body=${enc(message)}`}>
          E-mail
        </a>
      </div>
    </section>
  );
}
