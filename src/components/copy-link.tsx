"use client";

import { useState } from "react";

/** Copie dans le presse-papiers, avec repli pour les vieux navigateurs. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

/**
 * Un lien à envoyer : le domaine en petit (c'est lui qu'on raccourcit si la place manque),
 * la fin du lien en gras, toujours lisible. Un clic dessus l'affiche en entier, sélectionné d'un coup.
 */
export function CopyLink({ url, light = true }: { url: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [full, setFull] = useState(false);
  const bare = url.replace(/^https?:\/\//, "");
  const slash = bare.indexOf("/");
  const host = slash > 0 ? bare.slice(0, slash + 1) : "";
  const path = slash > 0 ? bare.slice(slash + 1) : bare;

  async function copy() {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className={`copy-link${light ? " copy-link-light" : ""}${full ? " copy-link-full" : ""}`}>
      <button
        type="button"
        className="copy-link-text"
        onClick={() => setFull((v) => !v)}
        aria-expanded={full}
        title={full ? "Réduire" : "Voir le lien en entier"}
      >
        {full ? (
          <span className="copy-link-all">
            {/* coupures propres : après les « / » et les « . » */}
            {url.split(/(?<=[/.])/).map((part, i) => (
              <span key={i}>
                {part}
                <wbr />
              </span>
            ))}
          </span>
        ) : (
          <>
            <span className="copy-link-host">{host}{"\u200E"}</span>
            <span className="copy-link-path">{path}</span>
          </>
        )}
      </button>
      <button className={`btn ${light ? "b-light" : "b-soft"} copy-link-btn`} type="button" onClick={copy}>
        {copied ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}
