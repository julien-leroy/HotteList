"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cleanLists } from "@/app/actions/family";
import { IconStar } from "./icons";
import { useAction } from "./toaster";

export function EventOver({ eventName, familyId, isAdmin, taken, free }: { eventName: string; familyId: string; isAdmin: boolean; taken: number; free: number }) {
  const [confirming, setConfirming] = useState(false);
  const { pending, run } = useAction();
  const s = (n: number) => (n > 1 ? "s" : "");
  const cleaned = taken === 0;

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-6">
      <div
        className="relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[22px] px-7 py-6 text-ivoire"
        style={{ background: "linear-gradient(135deg,#1F4D36,#14382A)", border: "2px solid #D9A93E", boxShadow: "0 24px 50px -30px rgba(20,56,42,.9)" }}
      >
        <div className="flex min-w-0 flex-[1_1_380px] items-center gap-4">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-or-clair text-bordeaux-fonce">
            <IconStar size={26} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display m-0 text-[28px] leading-tight font-bold italic">
              {cleaned ? "Les listes sont prêtes pour la suite" : `C'est fini pour ${eventName} ! Merci à tous`}
            </h2>
            <p className="m-0 text-[15px] text-[#D8E8DE]">
              {cleaned
                ? `${free} souhait${s(free)} encore sur les listes.${isAdmin ? " Pensez à choisir le prochain événement et sa date dans les réglages." : ""}`
                : `${taken} cadeau${taken > 1 ? "x" : ""} offert${s(taken)} · ${free} encore sur les listes`}
            </p>
          </div>
        </div>
        {isAdmin && !cleaned && (
          <button className="btn b-light" style={{ minHeight: 48 }} onClick={() => setConfirming(true)}>
            Nettoyer les listes
          </button>
        )}
      </div>

      <Dialog.Root open={confirming} onOpenChange={setConfirming}>
        <Dialog.Portal>
          <Dialog.Overlay className="veil">
            <Dialog.Content className="modal flex max-w-[520px] flex-col gap-4 p-8" aria-describedby={undefined}>
              <Dialog.Title className="font-display m-0 text-[28px] font-bold">Nettoyer les listes ?</Dialog.Title>
              <p className="m-0 text-[15px] leading-relaxed text-[#3E3B2E]">
                <strong>{taken} cadeau{taken > 1 ? "x" : ""} réservé{s(taken)} ou offert{s(taken)} à plusieurs</strong> vont être archivés et disparaîtront des listes.
                Les <strong>{free} autre{s(free)}</strong> restent en place, avec leurs commentaires, prêts pour la prochaine fois.
              </p>
              <p className="m-0 text-sm text-gris">Rien n&apos;est supprimé : les archives restent conservées.</p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  className="btn b-red"
                  disabled={pending}
                  onClick={() => run(() => cleanLists(familyId), "Listes nettoyées.", (r) => r.ok && setConfirming(false))}
                >
                  {pending ? "Nettoyage…" : "Oui, nettoyer"}
                </button>
                <Dialog.Close asChild>
                  <button className="btn b-quiet">Annuler</button>
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
