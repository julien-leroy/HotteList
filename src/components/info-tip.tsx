"use client";

import { useId } from "react";

/**
 * Petite info-bulle « i » : les précisions utiles mais pas indispensables restent cachées,
 * visibles au survol (ordinateur) ou au toucher (téléphone).
 */
export function InfoTip({ children, label = "Plus d'infos", align = "center" }: { children: React.ReactNode; label?: string; align?: "center" | "start" | "end" }) {
  const id = useId();
  return (
    <span className={`tip tip-${align}`}>
      <button type="button" className="tip-i" aria-label={label} aria-describedby={id} onClick={(e) => e.currentTarget.focus()}>
        i
      </button>
      <span role="tooltip" id={id} className="tip-box">
        {children}
      </span>
    </span>
  );
}
