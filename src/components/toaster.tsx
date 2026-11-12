"use client";

import { useEffect, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";

// ---------- Toasts (avec bouton « Annuler » facultatif) ----------

type Undo = { label?: string; run: () => Promise<Result> | void };
type ToastMsg = { text: string; error?: boolean; undo?: Undo; id: number };

export function toast(text: string, error = false, undo?: Undo) {
  window.dispatchEvent(new CustomEvent("hl-toast", { detail: { text, error, undo } }));
}

export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as Omit<ToastMsg, "id">;
      setMsg({ ...d, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), d.undo ? 7000 : 4200);
    };
    window.addEventListener("hl-toast", on);
    return () => window.removeEventListener("hl-toast", on);
  }, []);
  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className={`toast${msg.error ? " err" : ""}`} key={msg.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span>{msg.text}</span>
      {msg.undo && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await msg.undo!.run();
            setBusy(false);
            if (r && !r.ok) toast(r.error, true);
            else setMsg(null);
          }}
          style={{ border: 0, background: "transparent", color: "#FFCB2E", font: "700 14px var(--font-sans)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: "4px 2px" }}
        >
          {msg.undo.label ?? "Annuler"}
        </button>
      )}
    </div>
  );
}

// ---------- Confirmations dans le style du site (remplace window.confirm) ----------

type ConfirmOpts = { title: string; message?: string; confirmLabel?: string; danger?: boolean };
type ConfirmReq = ConfirmOpts & { resolve: (ok: boolean) => void };

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent("hl-confirm", { detail: { ...opts, resolve } })));
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmReq | null>(null);
  useEffect(() => {
    const on = (e: Event) => setReq((e as CustomEvent).detail as ConfirmReq);
    window.addEventListener("hl-confirm", on);
    return () => window.removeEventListener("hl-confirm", on);
  }, []);
  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };
  return (
    <Dialog.Root open={Boolean(req)} onOpenChange={(o) => !o && close(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="veil" style={{ zIndex: 70 }}>
          <Dialog.Content role="alertdialog" className="modal flex max-w-[480px] flex-col gap-4 p-7" aria-describedby={undefined}>
            <Dialog.Title className="font-display m-0 text-[26px] leading-tight font-bold">{req?.title}</Dialog.Title>
            {req?.message && <p className="m-0 text-[15px] leading-relaxed text-[#3E3B2E]">{req.message}</p>}
            <div className="flex flex-wrap gap-2.5">
              <button className={`btn ${req?.danger ? "b-red" : "b-go"}`} type="button" autoFocus onClick={() => close(true)}>
                {req?.confirmLabel ?? "Confirmer"}
              </button>
              <button className="btn b-quiet" type="button" onClick={() => close(false)}>Annuler</button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------- Actions serveur ----------

type Result = { ok: true; url?: string; message?: string } | { ok: false; error: string };

/** Lance une action serveur ; affiche l'erreur éventuelle, ou le succès (avec « Annuler » si fourni). */
export function useAction() {
  const [pending, start] = useTransition();
  function run(fn: () => Promise<Result>, success?: string, after?: (r: Result) => void, undo?: Undo) {
    start(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error, true);
      else if (success) toast(success, false, undo);
      after?.(r);
    });
  }
  return { pending, run };
}
