"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "hl-guest-banner-hidden";

/** Bandeau discret pour un invité : créer son compte, quand il veut. Masquable (mémorisé dans le navigateur). */
export function GuestBanner({ next, mail }: { next: string; mail: boolean }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;
  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-5 py-3.5" style={{ background: "#F8EDD2", border: "1px solid #E5CF96" }}>
        <p className="m-0 flex-[1_1_300px] text-[15px] leading-normal text-[#4A3810]">
          {mail
            ? "Créez votre compte pour gérer votre profil, vous connecter de partout et recevoir les notifications par e-mail."
            : "Créez votre compte pour gérer votre profil et vous connecter de partout."}
        </p>
        <span className="flex gap-2">
          <Link className="btn b-gold b-sm" href={`/creer-mon-compte?next=${encodeURIComponent(next)}`}>Créer mon compte</Link>
          <button
            type="button"
            className="btn b-quiet b-sm"
            onClick={() => {
              setHidden(true);
              try {
                localStorage.setItem(KEY, "1");
              } catch {}
            }}
          >
            Plus tard
          </button>
        </span>
      </div>
    </div>
  );
}
