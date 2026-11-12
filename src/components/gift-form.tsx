"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconClose } from "./icons";
import { createGift, updateGift } from "@/app/actions/gifts";
import { formatPrice } from "@/lib/format";
import { GiftVisual, SourceBadge } from "./gift-ui";
import { useAction } from "./toaster";

type Draft = { url: string; title: string; price: string; description: string; imageUrl: string; favorite: boolean };

type Props =
  | {
      mode: "create";
      familyId: string;
      recipientId: string;
      kind: "SOUHAIT" | "IDEE";
      title: string;
      hint: string;
      onDone: () => void;
      /** dans une popup : pas de cadre ni de titre (la popup les affiche) */
      bare?: boolean;
      /** cadeaux déjà visibles dans cette liste, pour prévenir les doublons */
      existing?: { title: string; url: string | null }[];
    }
  | {
      mode: "edit";
      giftId: string;
      kind: "SOUHAIT" | "IDEE";
      initial: Draft;
      onDone: () => void;
      compact?: boolean;
    };

/** Même article ? On compare le site et le chemin, sans les paramètres de suivi. */
function sameUrl(a: string, b: string) {
  try {
    const x = new URL(a.trim()), y = new URL(b.trim());
    const clean = (u: URL) => u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "").replace(/\/ref=.*$/, "");
    return clean(x) === clean(y);
  } catch {
    return false;
  }
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function GiftForm(props: Props) {
  const [d, setD] = useState<Draft>(
    props.mode === "edit" ? props.initial : { url: "", title: "", price: "", description: "", imageUrl: "", favorite: false },
  );
  const [looking, setLooking] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [showImageField, setShowImageField] = useState(props.mode === "edit" && Boolean(props.initial.imageUrl));
  const lastLooked = useRef("");
  const { pending, run } = useAction();
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((x) => ({ ...x, [k]: e.target.value }));

  async function lookup(url: string) {
    const u = url.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(u) || u === lastLooked.current) return;
    lastLooked.current = u;
    setLooking(true);
    setLookupNote(null);
    try {
      const res = await fetch("/api/apercu-lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const p = (await res.json()) as { title?: string | null; imageUrl?: string | null; price?: string | null; error?: string };
      if (!res.ok) throw new Error(p.error);
      setD((x) => ({
        ...x,
        title: x.title || p.title || "",
        price: x.price || p.price || "",
        imageUrl: x.imageUrl || p.imageUrl || "",
      }));
      if (!p.title && !p.imageUrl) {
        setLookupNote("Ce site n'a rien voulu nous dire : remplissez le titre à la main, et collez l'adresse d'une image si vous voulez.");
        setShowImageField(true);
      }
    } catch {
      setLookupNote("Impossible de lire ce lien pour l'instant. Remplissez les champs à la main.");
    } finally {
      setLooking(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      title: d.title,
      url: d.url.trim() || null,
      price: d.price.trim() || null,
      description: d.description.trim() || null,
      imageUrl: d.imageUrl.trim() || null,
      favorite: d.favorite,
    };
    if (props.mode === "create") {
      run(
        () => createGift(props.familyId, props.recipientId, props.kind, input),
        props.kind === "IDEE" ? "Idée ajoutée, bien cachée." : "Souhait ajouté !",
        (r) => r.ok && props.onDone(),
      );
    } else {
      run(() => updateGift(props.giftId, input), "Modifications enregistrées.", (r) => r.ok && props.onDone());
    }
  }

  const idBase = props.mode === "create" ? `n-${props.recipientId}` : `e-${props.giftId}`;
  const duplicate =
    props.mode === "create" && props.existing
      ? props.existing.find(
          (g) => (g.url && d.url && sameUrl(g.url, d.url)) || (d.title.trim().length > 3 && g.title.trim().toLowerCase() === d.title.trim().toLowerCase()),
        ) ?? null
      : null;
  const compact = props.mode === "edit" && props.compact;
  const bare = props.mode === "create" && props.bare;

  return (
    <form
      onSubmit={submit}
      className={compact ? "flex flex-col gap-3" : bare ? "flex flex-wrap gap-6" : "flex flex-wrap gap-6 rounded-[20px] bg-papier p-6"}
      style={compact || bare ? undefined : { border: "2px solid #CF2B35", boxShadow: "0 18px 40px -26px rgba(90,20,25,.6)" }}
    >
      <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-4">
        {bare ? null : props.mode === "create" ? (
          <div className="flex flex-col gap-1">
            <h3 className="font-display m-0 text-2xl font-bold">{props.title}</h3>
            <p className="m-0 text-sm text-gris">{props.hint}</p>
          </div>
        ) : (
          <h2 className="font-display m-0 text-2xl font-bold">Modifier</h2>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`${idBase}-u`}>Lien de l&apos;article <span className="opt">(facultatif)</span></label>
          <input
            className="input"
            id={`${idBase}-u`}
            type="url"
            inputMode="url"
            value={d.url}
            autoFocus={bare}
            onChange={set("url")}
            onBlur={(e) => lookup(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              setTimeout(() => lookup(text), 0);
            }}
            placeholder="Collez un lien Amazon, Fnac, Decathlon…"
          />
          {looking && <span className="text-xs font-semibold text-sapin-clair">Lecture du lien…</span>}
          {lookupNote && <span className="text-xs text-gris">{lookupNote}</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-[3_1_200px] flex-col gap-1.5">
            <label className="label" htmlFor={`${idBase}-t`}>Titre</label>
            <input className="input" id={`${idBase}-t`} value={d.title} onChange={set("title")} required maxLength={200} placeholder="Rempli automatiquement depuis le lien" />
          </div>
          <div className="flex flex-[1_1_110px] flex-col gap-1.5">
            <label className="label" htmlFor={`${idBase}-p`}>Prix</label>
            <input className="input" id={`${idBase}-p`} value={d.price} onChange={set("price")} maxLength={30} placeholder="€" inputMode="decimal" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`${idBase}-d`}>Description <span className="opt">(facultatif)</span></label>
          <textarea className="input" id={`${idBase}-d`} value={d.description} onChange={set("description")} maxLength={2000} placeholder="Taille, couleur, modèle, pourquoi ça lui plairait…" />
        </div>
        {showImageField ? (
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor={`${idBase}-i`}>Adresse de l&apos;image <span className="opt">(facultatif)</span></label>
            <input className="input" id={`${idBase}-i`} type="url" value={d.imageUrl} onChange={set("imageUrl")} placeholder="https://…/image.jpg" />
          </div>
        ) : (
          <button type="button" className="btn b-quiet self-start" onClick={() => setShowImageField(true)}>
            Choisir l&apos;image moi-même
          </button>
        )}
        {duplicate && (
          <p role="status" className="m-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ background: "#F8EDD2", border: "1px solid #E5CF96", color: "#6E500F" }}>
            Déjà dans cette liste : « {duplicate.title} ». Vous pouvez quand même l&apos;ajouter.
          </p>
        )}
        {props.kind === "SOUHAIT" && (
          <label className="chk">
            <input type="checkbox" checked={d.favorite} onChange={(e) => setD((x) => ({ ...x, favorite: e.target.checked }))} />
            Coup de cœur
          </label>
        )}
        <div className="flex flex-wrap gap-2.5">
          <button className="btn b-red" type="submit" disabled={pending || looking}>
            {pending ? "Enregistrement…" : props.mode === "edit" ? "Enregistrer" : props.kind === "IDEE" ? "Ajouter l'idée" : "Ajouter à la liste"}
          </button>
          <button className="btn b-quiet" type="button" onClick={props.onDone}>Annuler</button>
        </div>
      </div>
      {!compact && (
        <div className="flex max-w-[240px] flex-[1_1_200px] flex-col gap-2">
          <span className="label">Aperçu</span>
          <div className="card" style={{ pointerEvents: "none" }}>
            <GiftVisual key={d.imageUrl} gift={{ id: idBase, imageUrl: d.imageUrl || null, title: d.title }} iconSize={72}>
              <SourceBadge site={host(d.url)} />
            </GiftVisual>
            <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
              <span className="text-[15px] font-semibold">{d.title || "Titre du cadeau"}</span>
              <span className="tag self-start">{formatPrice(d.price)}</span>
            </div>
          </div>
          <span className="text-xs leading-snug text-gris">L&apos;image est affichée directement depuis le site de l&apos;article.</span>
        </div>
      )}
    </form>
  );
}

/** Popup d'ajout d'un souhait ou d'une idée. */
export function AddGiftDialog(props: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  recipientId: string;
  kind: "SOUHAIT" | "IDEE";
  title: string;
  hint: string;
  existing?: { title: string; url: string | null }[];
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal flex max-w-[860px] flex-col gap-5 p-7" aria-describedby={undefined} onOpenAutoFocus={(e) => {
            // laisser autoFocus placer le curseur dans le champ du lien
            const el = (e.currentTarget as HTMLElement | null)?.querySelector("input");
            if (el) { e.preventDefault(); el.focus(); }
          }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="font-display m-0 text-[28px] font-bold">{props.title}</Dialog.Title>
                <p className="m-0 text-sm text-gris">{props.hint}</p>
              </div>
              <Dialog.Close asChild>
                <button className="btn b-soft b-icon" type="button" aria-label="Fermer" style={{ borderRadius: "50%", flex: "none" }}>
                  <IconClose size={18} />
                </button>
              </Dialog.Close>
            </div>
            {props.open && (
              <GiftForm
                mode="create"
                bare
                familyId={props.familyId}
                recipientId={props.recipientId}
                kind={props.kind}
                title={props.title}
                hint={props.hint}
                existing={props.existing}
                onDone={props.onClose}
              />
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
