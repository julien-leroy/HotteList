"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Familles ouvertes sur cet appareil : si la session a disparu (déconnexion, session expirée),
// la page de connexion propose d'y revenir pour toucher son nom, sans e-mail ni mot de passe.
const KEY = "hl-familles";
type Fam = { slug: string; name: string };

function read(): Fam[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((f) => f && typeof f.slug === "string" && typeof f.name === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

/** Sur la page famille : retient la famille sur cet appareil (la plus récente en premier). */
export function RememberFamily({ slug, name }: Fam) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([{ slug, name }, ...read().filter((f) => f.slug !== slug)].slice(0, 5)));
    } catch {}
  }, [slug, name]);
  return null;
}

/** Sur la page de connexion : « Retrouver ma place dans … ». */
export function RecentFamilies() {
  const [fams, setFams] = useState<Fam[]>([]);
  useEffect(() => setFams(read()), []);
  if (fams.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] px-5 py-4" style={{ background: "#F8EDD2", border: "1px solid #E5CF96" }}>
      <p className="m-0 text-[15px] font-semibold text-[#4A3810]">Pas de compte HotteList ? Touchez votre nom dans votre famille :</p>
      <div className="flex flex-wrap gap-2">
        {fams.map((f) => (
          <Link key={f.slug} href={`/f/${f.slug}`} className="btn b-gold b-sm">
            {f.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
