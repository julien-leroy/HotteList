"use client";

import { useState } from "react";
import type { VisibleGift } from "@/lib/visibility";
import { IconGift, IconLink } from "./icons";

const TINTS = [
  { bg: "#F6E7C1", ink: "#7A5410" },
  { bg: "#F6DCDD", ink: "#7E1621" },
  { bg: "#DCEDE2", ink: "#1F4D36" },
  { bg: "#E2E8EE", ink: "#3E5A6E" },
];

export function tintFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export type Status =
  | { kind: "HIDDEN" }
  | { kind: "FREE" }
  | { kind: "MINE" }
  | { kind: "OTHER"; by: string }
  | { kind: "GROUP"; mine: boolean; people: string };

export function statusOf(g: VisibleGift): Status {
  const s = g.secret;
  if (!s) return { kind: "HIDDEN" };
  if (s.takeMode === "AUCUN") return { kind: "FREE" };
  if (s.takeMode === "SEUL") return s.iParticipate ? { kind: "MINE" } : { kind: "OTHER", by: s.participants[0]?.firstName ?? "quelqu'un" };
  return { kind: "GROUP", mine: s.iParticipate, people: s.participants.map((p) => p.firstName).join(", ") };
}

/** Image externe affichée directement depuis le site d'origine, avec illustration de secours. */
export function GiftVisual({
  gift,
  iconSize = 88,
  taken = false,
  className = "ph",
  style,
  children,
}: {
  gift: Pick<VisibleGift, "id" | "imageUrl" | "title">;
  iconSize?: number;
  taken?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const tint = tintFor(gift.id);
  const showImg = gift.imageUrl && !broken;
  return (
    <span className={`${className}${showImg ? "" : " dots"}`} style={{ background: showImg ? "#fff" : tint.bg, ...style }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="photo"
          src={gift.imageUrl!}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
          style={taken ? { opacity: 0.55 } : undefined}
        />
      ) : (
        <IconGift size={iconSize} stroke={tint.ink} strokeWidth={1.1} className="ill" />
      )}
      {children}
    </span>
  );
}

export function SourceBadge({ site }: { site: string | null }) {
  if (!site) return null;
  return (
    <span className="src">
      <IconLink size={12} />
      {site}
    </span>
  );
}
