"use client";

import { useEffect, useState, useTransition } from "react";

type ToastMsg = { text: string; error?: boolean; id: number };

export function toast(text: string, error = false) {
  window.dispatchEvent(new CustomEvent("hl-toast", { detail: { text, error } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { text: string; error?: boolean };
      setMsg({ ...d, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 4200);
    };
    window.addEventListener("hl-toast", on);
    return () => window.removeEventListener("hl-toast", on);
  }, []);
  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className={`toast${msg.error ? " err" : ""}`} key={msg.id}>
      {msg.text}
    </div>
  );
}

type Result = { ok: true; url?: string; message?: string } | { ok: false; error: string };

/** Lance une action serveur ; affiche l'erreur éventuelle dans un toast. */
export function useAction() {
  const [pending, start] = useTransition();
  function run(fn: () => Promise<Result>, success?: string, after?: (r: Result) => void) {
    start(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error, true);
      else if (success) toast(success);
      after?.(r);
    });
  }
  return { pending, run };
}
