"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { IconClose, IconLink, IconStar } from "./icons";
import { createGift, updateGift } from "@/app/actions/gifts";
import { formatPrice } from "@/lib/format";
import { ILLUSTRATIONS, guessIllustration, illustrationOf, illustrationUrl } from "@/lib/gift-illustrations";
import { GiftVisual, SourceBadge } from "./gift-ui";
import { GiftIllustration } from "./gift-illustration";
import { useAction } from "./toaster";
import { InfoTip } from "./info-tip";

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
      /** prénom du destinataire (case « Mode discret » des idées) */
      recipientName?: string;
    }
  | {
      mode: "edit";
      giftId: string;
      kind: "SOUHAIT" | "IDEE";
      initial: Draft;
      onDone: () => void;
      compact?: boolean;
    };

/** Réponse de /api/apercu-lien. */
type Preview = {
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  siteName: string | null;
  siteOrigin: string | null;
  status: "complete" | "partial" | "blocked" | "empty";
};

/**
 * Image choisie :
 *  auto   : la photo du lien si on en a une, sinon l'illustration devinée d'après le titre
 *  photo  : la photo trouvée avec le lien
 *  illu   : une illustration précise
 *  custom : une adresse d'image collée à la main
 */
type Choice = { kind: "auto" } | { kind: "photo" } | { kind: "illu"; key: string } | { kind: "custom" };

type Lookup =
  | { state: "idle" }
  | { state: "looking"; site: string | null }
  | { state: "done"; preview: Preview }
  | { state: "error" };

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
    return new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const isLink = (u: string) => /^https?:\/\/\S+\.\S+/i.test(u.trim());

/** Le lien collé contient souvent du texte autour (« Regarde ça ! https://… ») : on garde l'adresse. */
function extractUrl(text: string) {
  return text.match(/https?:\/\/[^\s<>"']+/i)?.[0] ?? text.trim();
}

const KNOWN_SITES = "Amazon, Fnac, Decathlon, Vinted, Leboncoin, Cdiscount, AliExpress, Apple…";

export function GiftForm(props: Props) {
  const initial = props.mode === "edit" ? props.initial : { url: "", title: "", price: "", description: "", imageUrl: "", favorite: false };
  const initialIllu = illustrationOf(initial.imageUrl);
  const initialPhoto = initial.imageUrl && !initialIllu ? initial.imageUrl : "";

  const [d, setD] = useState<Draft>(initial);
  const [photo, setPhoto] = useState(initialPhoto); // photo trouvée avec le lien (ou déjà enregistrée)
  const [choice, setChoice] = useState<Choice>(
    initialIllu ? { kind: "illu", key: initialIllu.key } : initialPhoto ? { kind: "photo" } : { kind: "auto" },
  );
  const [customUrl, setCustomUrl] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showDesc, setShowDesc] = useState(Boolean(initial.description));
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [canPaste, setCanPaste] = useState(false);
  const lastLooked = useRef(initial.url.trim());
  const autoFilled = useRef({ title: "", price: "" });
  const { pending, run } = useAction();
  /** idée cachée à la personne (par défaut) ; décochée, elle devient un souhait de sa liste, visible de tous */
  const [discreet, setDiscreet] = useState(true);
  const name = props.mode === "create" ? (props.recipientName ?? "La personne") : "";
  const asWish = props.mode === "create" && props.kind === "IDEE" && !discreet;

  useEffect(() => {
    setCanPaste(typeof navigator !== "undefined" && typeof navigator.clipboard?.readText === "function");
  }, []);

  // Lecture du lien un instant après la frappe (le collage, lui, est lu tout de suite)
  useEffect(() => {
    if (!isLink(d.url) || d.url.trim() === lastLooked.current) return;
    const t = setTimeout(() => readLink(d.url), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.url]);

  async function readLink(raw: string) {
    const u = extractUrl(raw);
    if (!isLink(u) || u === lastLooked.current) return;
    lastLooked.current = u;
    setLookup({ state: "looking", site: host(u) });
    try {
      const res = await fetch("/api/apercu-lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const p = (await res.json()) as Preview & { error?: string };
      if (!res.ok) throw new Error(p.error);
      if (lastLooked.current !== u) return; // un autre lien a été collé entre-temps
      // On remplace seulement ce qu'on avait rempli nous-mêmes : jamais ce que la personne a tapé
      setD((x) => {
        const next = { ...x };
        if (p.title && (!x.title.trim() || x.title === autoFilled.current.title)) next.title = p.title;
        if (p.price && (!x.price.trim() || x.price === autoFilled.current.price)) next.price = p.price;
        autoFilled.current = { title: p.title ?? "", price: p.price ?? "" };
        return next;
      });
      // nouvelle photo : elle remplace l'ancienne, sauf si la personne a choisi autre chose
      setPhoto(p.imageUrl ?? "");
      setChoice((c) => (c.kind === "photo" ? { kind: "auto" } : c));
      setLookup({ state: "done", preview: p });
    } catch {
      if (lastLooked.current === u) setLookup({ state: "error" });
    }
  }

  async function pasteLink() {
    try {
      const text = extractUrl(await navigator.clipboard.readText());
      if (!text) return;
      setD((x) => ({ ...x, url: text }));
      readLink(text);
    } catch {
      /* refusé par le navigateur : la personne collera à la main */
    }
  }

  const set = (k: "title" | "price" | "description") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((x) => ({ ...x, [k]: e.target.value }));

  const site = host(d.url);
  const guess = guessIllustration(d.title, site);
  const imageUrl =
    choice.kind === "photo"
      ? photo
      : choice.kind === "illu"
        ? illustrationUrl(choice.key)
        : choice.kind === "custom"
          ? customUrl.trim()
          : photo || (guess ? illustrationUrl(guess) : "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      title: d.title,
      url: d.url.trim() ? extractUrl(d.url) : null,
      price: d.price.trim() || null,
      description: d.description.trim() || null,
      imageUrl: imageUrl || null,
      favorite: d.favorite,
    };
    if (props.mode === "create") {
      run(
        () => createGift(props.familyId, props.recipientId, props.kind, input, discreet),
        props.kind === "SOUHAIT" ? "Souhait ajouté !" : discreet ? "Idée ajoutée, bien cachée." : `Ajouté à la liste de ${name}.`,
        (r) => r.ok && props.onDone(),
      );
    } else {
      run(() => updateGift(props.giftId, input), "Modifications enregistrées.", (r) => r.ok && props.onDone());
    }
  }

  const idBase = props.mode === "create" ? `n-${props.recipientId}` : `e-${props.giftId}`;
  const duplicate =
    props.mode === "create" && props.existing
      ? (props.existing.find(
          (g) => (g.url && d.url && sameUrl(g.url, d.url)) || (d.title.trim().length > 3 && g.title.trim().toLowerCase() === d.title.trim().toLowerCase()),
        ) ?? null)
      : null;
  const compact = props.mode === "edit" && props.compact;
  const bare = props.mode === "create" && props.bare;
  const looking = lookup.state === "looking";

  return (
    <form
      onSubmit={submit}
      className={compact ? "flex flex-col gap-4" : bare ? "flex flex-wrap gap-6" : "flex flex-wrap gap-6 rounded-[20px] bg-papier p-6"}
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

        {/* 1. Le lien : il remplit tout le reste */}
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor={`${idBase}-u`}>
            Lien de l&apos;article <span className="opt">(facultatif)</span>
          </label>
          <div className="gf-url">
            <IconLink size={17} className="gf-url-icon" />
            <input
              className="input"
              id={`${idBase}-u`}
              type="url"
              inputMode="url"
              autoComplete="off"
              value={d.url}
              autoFocus={bare}
              onChange={(e) => setD((x) => ({ ...x, url: e.target.value }))}
              onBlur={(e) => readLink(e.target.value)}
              onPaste={(e) => {
                const text = extractUrl(e.clipboardData.getData("text"));
                if (!isLink(text)) return;
                e.preventDefault();
                setD((x) => ({ ...x, url: text }));
                readLink(text);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  readLink(e.currentTarget.value);
                }
              }}
              placeholder="https://…"
            />
            {d.url ? (
              <button
                type="button"
                className="gf-url-btn"
                aria-label="Effacer le lien"
                onClick={() => {
                  setD((x) => ({ ...x, url: "" }));
                  lastLooked.current = "";
                  setLookup({ state: "idle" });
                  setPhoto("");
                  setChoice((c) => (c.kind === "photo" ? { kind: "auto" } : c));
                }}
              >
                <IconClose size={14} />
              </button>
            ) : (
              canPaste && (
                <button type="button" className="gf-url-btn gf-paste" onClick={pasteLink}>
                  Coller
                </button>
              )
            )}
          </div>
          <LookupNote lookup={lookup} hasUrl={Boolean(d.url.trim())} hasTitle={Boolean(d.title.trim())} />
        </div>

        {/* 2. Titre et prix */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-[3_1_200px] flex-col gap-1.5">
            <label className="label" htmlFor={`${idBase}-t`}>Titre</label>
            <input
              className={`input${looking && !d.title ? " gf-shimmer" : ""}`}
              id={`${idBase}-t`}
              value={d.title}
              onChange={set("title")}
              required
              maxLength={200}
              placeholder={looking ? "Lecture du lien…" : "Ex. : Casque audio sans fil"}
            />
          </div>
          <div className="flex flex-[1_1_110px] flex-col gap-1.5">
            <label className="label" htmlFor={`${idBase}-p`}>Prix <span className="opt">(environ)</span></label>
            <div className="gf-price">
              <input
                className={`input${looking && !d.price ? " gf-shimmer" : ""}`}
                id={`${idBase}-p`}
                value={d.price}
                onChange={set("price")}
                maxLength={30}
                placeholder="0"
                inputMode="decimal"
              />
              {/^\s*\d+([.,]\d{1,2})?\s*$/.test(d.price) || !d.price ? <span className="gf-price-unit">€</span> : null}
            </div>
          </div>
        </div>

        {/* 3. L'image : photo du lien, illustration, ou adresse collée */}
        <ImageField
          idBase={idBase}
          choice={choice}
          photo={photo}
          guess={guess}
          imageUrl={imageUrl}
          site={lookup.state === "done" ? (lookup.preview.siteName ?? site) : site}
          looking={looking}
          open={pickerOpen}
          setOpen={setPickerOpen}
          customUrl={customUrl}
          setCustomUrl={setCustomUrl}
          onChoose={(c) => {
            setChoice(c);
            if (c.kind !== "custom") setPickerOpen(false);
          }}
        />

        {/* 4. Précisions, repliées tant qu'on n'en a pas besoin */}
        {showDesc ? (
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor={`${idBase}-d`}>Précisions <span className="opt">(facultatif)</span></label>
            <textarea
              className="input gf-desc"
              id={`${idBase}-d`}
              value={d.description}
              onChange={set("description")}
              maxLength={2000}
              autoFocus={!initial.description}
              placeholder="Taille, couleur, modèle, pourquoi ça lui plairait…"
            />
          </div>
        ) : (
          <button type="button" className="gf-more" onClick={() => setShowDesc(true)}>
            <span aria-hidden="true">+</span> Ajouter une précision <span className="opt">(taille, couleur, modèle…)</span>
          </button>
        )}

        {duplicate && (
          <p role="status" className="gf-note gf-note-warn m-0">
            Déjà dans cette liste : « {duplicate.title} ». Vous pouvez quand même l&apos;ajouter.
          </p>
        )}

        {props.kind === "SOUHAIT" && (
          <button
            type="button"
            className="gf-fav self-start"
            aria-pressed={d.favorite}
            onClick={() => setD((x) => ({ ...x, favorite: !x.favorite }))}
          >
            <IconStar size={16} />
            {d.favorite ? "Coup de cœur !" : "Coup de cœur ?"}
          </button>
        )}

        {props.mode === "create" && props.kind === "IDEE" && (
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1">
              <label className="chk">
                <input type="checkbox" checked={discreet} onChange={(e) => setDiscreet(e.target.checked)} />
                Mode discret
              </label>
              <InfoTip align="start">
                Coché : {name} ne la verra jamais, le reste de la famille peut la réserver et la commenter. Décoché : elle s&apos;ajoute à la liste de {name} comme un souhait écrit par {name}, visible de tous.
              </InfoTip>
            </span>
            <p className="m-0 text-sm text-gris">
              {discreet
                ? `${name} ne verra pas cette idée.`
                : `Visible de tous, ${name} compris, comme un souhait de sa part.`}
            </p>
          </div>
        )}

        <div className="gf-actions">
          <button className="btn b-primary" type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : props.mode === "edit" ? "Enregistrer" : asWish ? "Ajouter à sa liste" : props.kind === "IDEE" ? "Ajouter l'idée" : "Ajouter à la liste"}
          </button>
          <button className="btn b-quiet" type="button" onClick={props.onDone}>Annuler</button>
        </div>
      </div>

      {!compact && (
        <div className="hidden max-w-[240px] flex-[1_1_200px] flex-col gap-2 sm:flex">
          <span className="label">Aperçu</span>
          <div className={`card${looking ? " gf-shimmer" : ""}`} style={{ pointerEvents: "none" }}>
            <GiftVisual key={imageUrl} gift={{ id: idBase, imageUrl: imageUrl || null, title: d.title }} iconSize={72}>
              <SourceBadge site={site} />
            </GiftVisual>
            <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3.5">
              <span className="text-[15px] font-semibold">{d.title || "Titre du cadeau"}</span>
              <span className="flex items-center gap-2">
                <span className="tag self-start">{formatPrice(d.price)}</span>
                {d.favorite && <IconStar size={15} style={{ color: "#D9A93E" }} />}
              </span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

/** Ce qu'a donné la lecture du lien, en une phrase. */
function LookupNote({ lookup, hasUrl, hasTitle }: { lookup: Lookup; hasUrl: boolean; hasTitle: boolean }) {
  if (lookup.state === "idle") {
    return hasUrl ? null : (
      <span className="gf-hint">
        Marche avec {KNOWN_SITES} Pas de lien ? Un titre suffit.
      </span>
    );
  }
  if (lookup.state === "looking") {
    return (
      <span className="gf-note gf-note-wait" role="status">
        <span className="gf-spin" aria-hidden="true" /> On regarde la page{lookup.site ? ` sur ${lookup.site}` : ""}…
      </span>
    );
  }
  if (lookup.state === "error") {
    return <span className="gf-note gf-note-soft" role="status">Impossible de lire ce lien pour l&apos;instant : remplissez le titre, on s&apos;occupe de l&apos;image.</span>;
  }
  const p = lookup.preview;
  const name = p.siteName ?? p.siteOrigin ?? "ce site";
  if (p.status === "complete") {
    return <span className="gf-note gf-note-ok" role="status">✓ Trouvé sur {name} : titre, photo et prix.</span>;
  }
  if (p.status === "partial") {
    const got = [p.title && "titre", p.imageUrl && "photo", p.price && "prix"].filter(Boolean).join(" et ");
    const missing = !p.price ? " Ajoutez le prix si vous le connaissez." : !p.imageUrl ? " Choisissez une illustration si vous voulez." : "";
    return <span className="gf-note gf-note-ok" role="status">✓ Trouvé sur {name} : {got}.{missing}</span>;
  }
  if (p.status === "blocked") {
    return (
      <span className="gf-note gf-note-soft" role="status">
        {name} ne nous laisse pas lire sa page.{" "}
        {p.title ? "On a repris le nom depuis le lien : vérifiez-le" : hasTitle ? "Vérifiez le titre" : "Donnez un titre"}, l&apos;illustration suit.
      </span>
    );
  }
  return <span className="gf-note gf-note-soft" role="status">Ce lien n&apos;a rien donné : donnez un titre, l&apos;illustration suit.</span>;
}

function ImageField(props: {
  idBase: string;
  choice: Choice;
  photo: string;
  guess: string | null;
  imageUrl: string;
  site: string | null;
  looking: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  customUrl: string;
  setCustomUrl: (v: string) => void;
  onChoose: (c: Choice) => void;
}) {
  const { choice, photo, guess, imageUrl } = props;
  const illu = illustrationOf(imageUrl);
  const usesPhoto = Boolean(imageUrl) && !illu && choice.kind !== "custom";
  const label = props.looking && choice.kind === "auto" && !photo
    ? "Recherche de la photo…"
    : choice.kind === "custom"
      ? "Image choisie à la main"
      : usesPhoto
        ? `Photo${props.site ? ` de ${props.site}` : ""}`
        : illu
          ? illu.label
          : "Cadeau surprise";
  const sub =
    choice.kind === "auto"
      ? usesPhoto
        ? "trouvée avec le lien"
        : illu
          ? "d'après le titre"
          : "illustration par défaut"
      : choice.kind === "illu"
        ? "illustration"
        : choice.kind === "custom"
          ? "depuis une adresse"
          : "trouvée avec le lien";
  const selected = (c: Choice) =>
    c.kind === choice.kind && (c.kind !== "illu" || (choice.kind === "illu" && c.key === choice.key));
  // Les illustrations : la suggestion d'après le titre d'abord
  const illus = guess ? [...ILLUSTRATIONS].sort((a, b) => Number(b.key === guess) - Number(a.key === guess)) : ILLUSTRATIONS;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="label" id={`${props.idBase}-img`}>Image</span>
      <button
        type="button"
        className="gf-image"
        aria-expanded={props.open}
        aria-controls={`${props.idBase}-pick`}
        onClick={() => props.setOpen(!props.open)}
      >
        <GiftVisual
          key={imageUrl}
          gift={{ id: props.idBase, imageUrl: imageUrl || null, title: "" }}
          iconSize={30}
          className={`ph gf-thumb${props.looking && !photo ? " gf-shimmer" : ""}`}
        />
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-[15px] font-semibold">{label}</span>
          <span className="text-xs text-gris">{sub}</span>
        </span>
        <span className="gf-change">{props.open ? "Fermer" : "Changer"}</span>
      </button>

      {props.open && (
        <div className="gf-pick" id={`${props.idBase}-pick`} role="group" aria-labelledby={`${props.idBase}-img`}>
          {photo && (
            <Tile label="Photo du lien" selected={selected({ kind: "photo" }) || (choice.kind === "auto" && usesPhoto)} onClick={() => props.onChoose({ kind: "photo" })}>
              <GiftVisual gift={{ id: "photo", imageUrl: photo, title: "" }} iconSize={26} className="ph gf-tile-ph" />
            </Tile>
          )}
          {illus.map((i) => (
            <Tile
              key={i.key}
              label={i.label}
              hint={i.key === guess ? "suggérée" : undefined}
              selected={selected({ kind: "illu", key: i.key }) || (choice.kind === "auto" && !usesPhoto && illu?.key === i.key)}
              onClick={() => props.onChoose({ kind: "illu", key: i.key })}
            >
              <span className="ph gf-tile-ph dots" style={{ background: i.tint.bg }}>
                <GiftIllustration name={i.key} size={28} color={i.tint.ink} strokeWidth={1.5} />
              </span>
            </Tile>
          ))}
          <Tile label="Autre image" selected={choice.kind === "custom"} onClick={() => props.onChoose({ kind: "custom" })}>
            <span className="ph gf-tile-ph" style={{ background: "#fff", border: "1.5px dashed #D8C9A8" }}>
              <IconLink size={22} style={{ color: "#5E5A48" }} />
            </span>
          </Tile>
        </div>
      )}

      {choice.kind === "custom" && (
        <input
          className="input"
          type="url"
          inputMode="url"
          aria-label="Adresse de l'image"
          value={props.customUrl}
          onChange={(e) => props.setCustomUrl(e.target.value)}
          autoFocus
          placeholder="Adresse de l'image : https://…/image.jpg"
        />
      )}
    </div>
  );
}

function Tile(props: { label: string; hint?: string; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="gf-tile" aria-pressed={props.selected} onClick={props.onClick} title={props.label}>
      {props.children}
      <span className="gf-tile-label">{props.label}</span>
      {props.hint && <span className="gf-tile-hint">{props.hint}</span>}
    </button>
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
  recipientName?: string;
}) {
  return (
    <Dialog.Root open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal add-modal flex max-w-[860px] flex-col gap-4 p-5 sm:gap-5 sm:p-7" aria-describedby={undefined} onOpenAutoFocus={(e) => {
            // laisser autoFocus placer le curseur dans le champ du lien
            const el = (e.currentTarget as HTMLElement | null)?.querySelector("input");
            if (el) { e.preventDefault(); el.focus(); }
          }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Dialog.Title className="font-display m-0 text-[22px] font-bold sm:text-[28px]">{props.title}</Dialog.Title>
                <p className="m-0 hidden text-sm text-gris sm:block">{props.hint}</p>
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
                recipientName={props.recipientName}
                onDone={props.onClose}
              />
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
