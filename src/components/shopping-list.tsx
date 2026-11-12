"use client";

import { listTitleProps } from "@/lib/script-metrics";
import { useState } from "react";
import Link from "next/link";
import { setPurchaseStatus } from "@/app/actions/gifts";
import { formatPrice } from "@/lib/format";
import { priceValue } from "./price";
import { Avatar, type AvatarPerson } from "./avatar";
import { GiftVisual } from "./gift-ui";
import { IconComment, IconExternal } from "./icons";
import { useAction } from "./toaster";

type Status = "A_ACHETER" | "ACHETE" | "EMBALLE";

export type ShoppingItem = {
  giftId: string;
  title: string;
  price: string | null;
  url: string | null;
  imageUrl: string | null;
  siteOrigin: string | null;
  status: Status;
  group: boolean;
  others: string[];
  comments: number;
  recipient: AvatarPerson & { id: string };
  family: { id: string; name: string; slug: string };
  changedSinceMine: boolean;
};

const LABEL: Record<Status, string> = { A_ACHETER: "À acheter", ACHETE: "Acheté", EMBALLE: "Emballé" };
const TONE: Record<Status, { bg: string; fg: string }> = {
  A_ACHETER: { bg: "#F6DCDD", fg: "#7E1621" },
  ACHETE: { bg: "#F6E7C1", fg: "#5C4214" },
  EMBALLE: { bg: "#DCEDE2", fg: "#14492F" },
};

/** Ma part estimée : prix entier seul, divisé par le nombre de participants à plusieurs. */
function myShare(i: ShoppingItem) {
  const v = priceValue(i.price);
  if (v == null) return null;
  return i.group ? v / (i.others.length + 1) : v;
}

const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: n % 1 ? 2 : 0 });

export function ShoppingList({ items }: { items: ShoppingItem[] }) {
  const [filter, setFilter] = useState<Status | "TOUS">("TOUS");
  const counts = { A_ACHETER: 0, ACHETE: 0, EMBALLE: 0 } as Record<Status, number>;
  for (const i of items) counts[i.status]++;
  const total = items.reduce((s, i) => s + (myShare(i) ?? 0), 0);
  const left = items.filter((i) => i.status === "A_ACHETER").reduce((s, i) => s + (myShare(i) ?? 0), 0);
  const unknown = items.filter((i) => myShare(i) == null).length;

  const shown = filter === "TOUS" ? items : items.filter((i) => i.status === filter);
  // Regroupé par personne à qui j'offre
  const groups = new Map<string, { person: ShoppingItem["recipient"]; items: ShoppingItem[] }>();
  for (const i of shown) {
    const g = groups.get(i.recipient.id) ?? { person: i.recipient, items: [] };
    g.items.push(i);
    groups.set(i.recipient.id, g);
  }

  return (
    <>
      {/* RÉCAPITULATIF */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))" }}>
        <Stat label="Cadeaux" value={String(items.length)} sub={`pour ${new Set(items.map((i) => i.recipient.id)).size} personne(s)`} />
        <Stat label="Budget estimé" value={euros(total)} sub={unknown ? `+ ${unknown} sans prix` : "ma part, cadeaux à plusieurs divisés"} />
        <Stat label="Reste à acheter" value={euros(left)} sub={`${counts.A_ACHETER} cadeau${counts.A_ACHETER > 1 ? "x" : ""}`} accent />
        <Stat label="Prêts" value={`${counts.EMBALLE} / ${items.length}`} sub={counts.ACHETE ? `${counts.ACHETE} à emballer` : counts.EMBALLE === items.length ? "tout est prêt !" : "rien à emballer pour l'instant"} />
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 p-3 print:hidden">
        <div className="seg" role="group" aria-label="Filtrer">
          {(["TOUS", "A_ACHETER", "ACHETE", "EMBALLE"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "TOUS" ? `Tout (${items.length})` : `${LABEL[f]} (${counts[f]})`}
            </button>
          ))}
        </div>
        <button type="button" className="btn b-soft" onClick={() => window.print()}>Imprimer</button>
      </div>

      {[...groups.values()].map(({ person, items: list }) => (
        <section key={person.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-2" style={{ borderBottom: "2px dotted #D9A93E" }}>
            <Avatar person={person} size={44} style={{ border: "3px solid #FFFDF7", boxShadow: "0 0 0 2px #D9A93E" }} />
            <h2 {...listTitleProps(`Pour ${person.firstName}`, 40, 250)}>Pour {person.firstName}</h2>
            <span className="text-sm whitespace-nowrap text-gris">· {list.length} cadeau{list.length > 1 ? "x" : ""}</span>
          </div>
          {list.map((i) => (
            <Row key={i.giftId} item={i} />
          ))}
        </section>
      ))}
      {shown.length === 0 && <p className="m-0 text-gris">Rien dans cette catégorie.</p>}
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="panel flex flex-col gap-1 px-5 py-4" style={accent ? { borderColor: "#DDA3A7", background: "#FFF6F4" } : undefined}>
      <span className="text-xs font-bold tracking-wide text-gris-clair uppercase">{label}</span>
      <span className="text-[28px] leading-none font-extrabold tracking-tight" style={{ color: accent ? "#8A1C26" : "#1F3A2C" }}>{value}</span>
      <span className="text-[13px] text-gris">{sub}</span>
    </div>
  );
}

function Row({ item: i }: { item: ShoppingItem }) {
  const { pending, run } = useAction();
  const share = myShare(i);
  return (
    <div className="row" style={i.status === "EMBALLE" ? { opacity: 0.75 } : undefined}>
      <GiftVisual gift={{ id: i.giftId, imageUrl: i.imageUrl, title: i.title }} iconSize={30} style={{ width: 64, height: 64, aspectRatio: "1", borderRadius: 12, flex: "none" }} />
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <span className="text-base font-semibold" style={i.status === "EMBALLE" ? { textDecoration: "line-through", textDecorationColor: "#9CC2AC" } : undefined}>
          {i.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gris">
          <span>{i.family.name}</span>
          {i.siteOrigin && <span>· {i.siteOrigin}</span>}
          {i.group && <span>· à plusieurs{i.others.length ? ` avec ${i.others.join(", ")}` : ""}</span>}
          {i.comments > 0 && (
            <span className="cm">
              <IconComment size={11} />
              {i.comments}
            </span>
          )}
        </span>
        {i.changedSinceMine && <span className="text-xs font-semibold text-[#8A6516]">Modifié depuis votre réservation</span>}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="tag">{formatPrice(i.price)}</span>
        {i.group && share != null && <span className="text-xs text-gris">ma part ≈ {euros(share)}</span>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor={`st-${i.giftId}`}>Statut de « {i.title} »</label>
        <select
          id={`st-${i.giftId}`}
          className="input"
          disabled={pending}
          value={i.status}
          onChange={(e) => run(() => setPurchaseStatus(i.giftId, e.target.value as Status))}
          style={{ minHeight: 40, width: "auto", fontSize: 14, fontWeight: 700, background: TONE[i.status].bg, color: TONE[i.status].fg, borderColor: "transparent" }}
        >
          {(Object.keys(LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>{LABEL[s]}</option>
          ))}
        </select>
        {i.url && (
          <a className="btn b-soft b-icon print:hidden" href={i.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Voir l'article « ${i.title} » (nouvel onglet)`} style={{ minHeight: 40, width: 40 }}>
            <IconExternal />
          </a>
        )}
        <Link className="btn b-soft b-sm print:hidden" href={`/f/${i.family.slug}?cadeau=${i.giftId}`}>Détails</Link>
      </div>
    </div>
  );
}
