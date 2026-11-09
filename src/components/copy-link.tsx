"use client";

import { useState } from "react";

export function CopyLink({ url, light = true }: { url: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div
      className="flex items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-4"
      style={light ? { background: "rgba(0,0,0,.18)", border: "1px solid rgba(242,199,92,.55)" } : { background: "#FBF4E4", border: "1px solid #EADBB8" }}
    >
      <code className="min-w-0 flex-1 overflow-hidden text-[15px] font-semibold text-ellipsis whitespace-nowrap" style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>
        {url.replace(/^https?:\/\//, "")}
      </code>
      <button className={`btn ${light ? "b-light" : "b-soft"}`} type="button" onClick={copy} style={{ minHeight: 40 }}>
        {copied ? "Copié !" : "Copier"}
      </button>
    </div>
  );
}
