"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { setAvatar } from "@/app/actions/avatar";
import { AVATAR_BACKGROUNDS, AVATAR_IDS, DEFAULT_AVATAR_BG, type AvatarBackground } from "@/lib/avatars";
import { Avatar, type AvatarPerson } from "./avatar";
import { IconClose, IconEdit } from "./icons";
import { useAction } from "./toaster";

const GROUPS: { key: AvatarBackground["group"]; label: string }[] = [
  { key: "site", label: "Couleurs du site" },
  { key: "fantaisie", label: "Fantaisie" },
  { key: "degrade", label: "Dégradés" },
];

/**
 * Bouton « avatar + crayon » qui ouvre le choix de l'avatar : un personnage et un fond de cercle.
 * Pour soi (Mon compte) ou pour un compte géré.
 */
export function AvatarPicker({ personId, person, label = "Changer d'avatar" }: { personId: string; person: AvatarPerson; label?: string }) {
  const [open, setOpen] = useState(false);
  const [avatar, setAv] = useState<string | null>(person.avatar ?? null);
  const [bg, setBg] = useState<string>(person.avatarBg ?? DEFAULT_AVATAR_BG);
  const { pending, run } = useAction();
  const preview = { ...person, avatar, avatarBg: bg };

  function reset() {
    setAv(person.avatar ?? null);
    setBg(person.avatarBg ?? DEFAULT_AVATAR_BG);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (o) reset();
        setOpen(o);
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left" aria-label={label}>
          <span className="relative inline-flex">
            <Avatar person={person} size={64} style={{ border: "3px solid #FFFDF7", boxShadow: "0 0 0 2px #D9A93E", fontSize: 22 }} />
            <span className="absolute -right-1 -bottom-1 inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "#CF2B35", color: "#FFF9EE", border: "2px solid #FFFDF7" }}>
              <IconEdit size={13} />
            </span>
          </span>
          <span className="text-[15px] font-semibold text-[#8A1C26] underline decoration-1 underline-offset-4">{label}</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal flex max-w-[720px] flex-col gap-5 p-6 sm:p-7" aria-describedby={undefined}>
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="font-display m-0 text-[28px] font-bold">{label}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn b-soft b-icon" aria-label="Fermer" style={{ borderRadius: "50%" }}>
                  <IconClose size={18} />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex items-center gap-4">
              <Avatar person={preview} size={104} style={{ border: "4px solid #FFFDF7", boxShadow: "0 0 0 2px #D9A93E", fontSize: 34 }} />
              <div className="flex flex-col gap-1">
                <strong className="text-lg">{person.firstName}</strong>
                <span className="text-sm text-gris">{avatar ? "Un personnage, puis un fond." : "Choisissez un personnage."}</span>
              </div>
            </div>

            <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="label mb-2.5">Fond</legend>
              {GROUPS.map((g) => (
                <div key={g.key} className="flex flex-wrap items-center gap-2">
                  <span className="w-full text-xs font-semibold text-gris-clair sm:w-[120px]">{g.label}</span>
                  {AVATAR_BACKGROUNDS.filter((b) => b.group === g.key).map((b) => {
                    const on = b.key === bg;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        title={b.name}
                        aria-label={b.name}
                        aria-pressed={on}
                        onClick={() => setBg(b.key)}
                        className="h-9 w-9 cursor-pointer rounded-full p-0"
                        style={{
                          background: b.css,
                          border: "2px solid #FFFDF7",
                          boxShadow: on ? "0 0 0 2.5px #CF2B35" : "0 0 0 1px #D8CBAE",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </fieldset>

            <fieldset className="m-0 flex flex-col border-0 p-0">
              <legend className="label mb-2.5">Personnage</legend>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))" }}>
                {AVATAR_IDS.map((id) => {
                  const on = id === avatar;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={`Personnage ${Number(id)}`}
                      aria-pressed={on}
                      onClick={() => setAv(id)}
                      className="flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0.5"
                      style={{ boxShadow: on ? "0 0 0 3px #CF2B35" : "none" }}
                    >
                      <Avatar person={{ ...person, avatar: id, avatarBg: bg }} size={52} />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="sticky -bottom-6 -mx-6 flex flex-wrap items-center gap-2.5 border-t border-sable bg-papier px-6 py-4 sm:-mx-7 sm:px-7">
              <button
                type="button"
                className="btn b-go"
                disabled={pending || !avatar}
                onClick={() => run(() => setAvatar(personId, avatar, bg), "Avatar enregistré.", (r) => r.ok && setOpen(false))}
              >
                Enregistrer
              </button>
              <Dialog.Close asChild>
                <button type="button" className="btn b-quiet">Annuler</button>
              </Dialog.Close>
              {person.avatar && (
                <button
                  type="button"
                  className="btn b-quiet ml-auto"
                  disabled={pending}
                  onClick={() => run(() => setAvatar(personId, null, null), "Retour aux initiales.", (r) => r.ok && setOpen(false))}
                >
                  Revenir aux initiales
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
