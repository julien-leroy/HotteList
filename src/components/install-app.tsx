"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { IconClose, IconInstall, IconPlusSquare, IconShareIos } from "./icons";
import { toast } from "./toaster";

/*
 * « Installer l'application » :
 *  - sur téléphone, on propose d'installer HotteList sur l'écran d'accueil (Android : bouton natif ;
 *    iPhone : les gestes Partager → « Sur l'écran d'accueil ») ;
 *  - sur ordinateur, on propose de l'ajouter aux favoris (Ctrl + D), ou de l'installer si le navigateur sait faire.
 * La proposition s'ouvre seule à la première visite ; une icône dans l'en-tête permet d'y revenir.
 * Quand c'est fait (installée, ouverte en application, ou « C'est fait »), plus rien n'est proposé.
 */

type BIP = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
declare global {
  interface Window {
    __hlInstall?: BIP | null;
  }
}

const DONE = "hl-install-done";
const LATER = "hl-install-later";
const OPEN_EVENT = "hl-install-open";
const LATER_DAYS = 30;

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* navigation privée : tant pis, on le reproposera */
    }
  },
};

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}
function isDone() {
  return store.get(DONE) === "1" || standalone();
}
function platform() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const mobile = ios || /android|mobile/i.test(ua);
  const mac = /mac/i.test(navigator.platform) && !ios;
  return { ios, mobile, mac };
}
function markDone() {
  store.set(DONE, "1");
  window.dispatchEvent(new Event(OPEN_EVENT + "-done"));
}

/**
 * Script à placer tout en haut de <body> : le navigateur envoie « beforeinstallprompt » très tôt,
 * parfois avant que React soit prêt. On le garde de côté pour le bouton « Installer ».
 */
export const INSTALL_CAPTURE_SCRIPT = `window.__hlInstall=null;addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__hlInstall=e;dispatchEvent(new Event("hl-install-ready"))});addEventListener("appinstalled",function(){try{localStorage.setItem("${DONE}","1")}catch(e){}window.__hlInstall=null;dispatchEvent(new Event("${OPEN_EVENT}-done"))});`;

/** Icône de l'en-tête : visible tant que ce n'est pas fait. */
export function InstallButton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const sync = () => setShow(!isDone());
    sync();
    window.addEventListener(OPEN_EVENT + "-done", sync);
    return () => window.removeEventListener(OPEN_EVENT + "-done", sync);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ivoire hover:bg-white/10"
      aria-label="Installer l'application"
      title="Installer l'application"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <IconInstall size={22} />
    </button>
  );
}

/** La fenêtre de proposition, montée une fois pour tout le site (dans le layout racine). */
export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [p, setP] = useState({ ios: false, mobile: false, mac: false });

  useEffect(() => {
    setP(platform());
    const ready = () => setCanPrompt(!!window.__hlInstall);
    ready();
    const openIt = () => {
      setP(platform());
      ready();
      setOpen(true);
    };
    const done = () => setOpen(false);
    window.addEventListener("hl-install-ready", ready);
    window.addEventListener(OPEN_EVENT, openIt);
    window.addEventListener(OPEN_EVENT + "-done", done);

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Première visite : on propose tout seul, une fois (puis au plus tous les 30 jours si « Plus tard »)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = Number(store.get(LATER) || 0);
    if (!isDone() && Date.now() - later > LATER_DAYS * 864e5) timer = setTimeout(openIt, 3500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("hl-install-ready", ready);
      window.removeEventListener(OPEN_EVENT, openIt);
      window.removeEventListener(OPEN_EVENT + "-done", done);
    };
  }, []);

  function later() {
    store.set(LATER, String(Date.now()));
    setOpen(false);
  }
  function done(message: string) {
    markDone();
    setOpen(false);
    toast(message);
  }
  async function install() {
    const e = window.__hlInstall;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    window.__hlInstall = null;
    setCanPrompt(false);
    if (outcome === "accepted") done("HotteList est installée !");
  }

  const key = p.mac ? "⌘" : "Ctrl";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && later()}>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal install-modal flex max-w-[440px] flex-col gap-4 p-6" aria-describedby={undefined}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={48} height={48} style={{ borderRadius: 12, flex: "none" }} />
                <Dialog.Title className="font-display m-0 text-[22px] font-bold leading-tight">
                  {p.mobile ? "HotteList sur votre téléphone" : "Gardez HotteList sous la main"}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="btn b-soft b-icon" type="button" aria-label="Fermer" style={{ borderRadius: "50%", flex: "none" }}>
                  <IconClose size={16} />
                </button>
              </Dialog.Close>
            </div>

            {p.mobile ? (
              canPrompt ? (
                <>
                  <p className="m-0 text-[15px] leading-relaxed">
                    Installez HotteList sur votre écran d&apos;accueil : elle s&apos;ouvre en un geste, en plein écran, comme une vraie application.
                  </p>
                  <button className="btn b-primary" type="button" onClick={install}>
                    <IconInstall size={18} /> Installer l&apos;application
                  </button>
                </>
              ) : p.ios ? (
                <>
                  <p className="m-0 text-[15px] leading-relaxed">Ajoutez HotteList sur votre écran d&apos;accueil, elle s&apos;ouvrira comme une application :</p>
                  <ol className="install-steps">
                    <li>
                      Touchez <span className="install-key"><IconShareIos size={16} /> Partager</span> en bas de Safari
                    </li>
                    <li>
                      Choisissez <span className="install-key"><IconPlusSquare size={16} /> Sur l&apos;écran d&apos;accueil</span>
                    </li>
                    <li>Touchez « Ajouter »</li>
                  </ol>
                  <button className="btn b-primary" type="button" onClick={() => done("Parfait, HotteList est sur votre écran d'accueil !")}>
                    C&apos;est fait
                  </button>
                </>
              ) : (
                <>
                  <p className="m-0 text-[15px] leading-relaxed">
                    Ouvrez le menu du navigateur <span className="install-key">⋮</span> puis choisissez « Installer l&apos;application » ou « Ajouter à l&apos;écran d&apos;accueil ».
                  </p>
                  <button className="btn b-primary" type="button" onClick={() => done("Parfait, HotteList est sur votre écran d'accueil !")}>
                    C&apos;est fait
                  </button>
                </>
              )
            ) : (
              <>
                <p className="m-0 text-[15px] leading-relaxed">
                  Ajoutez HotteList à vos favoris pour la retrouver en un clic : appuyez sur{" "}
                  <span className="install-key">{key}</span> + <span className="install-key">D</span>.
                </p>
                <button className="btn b-primary" type="button" onClick={() => done("C'est noté, bonnes listes !")}>
                  C&apos;est fait
                </button>
                {canPrompt && (
                  <button className="gf-link self-center" type="button" onClick={install}>
                    Ou installez-la comme une application
                  </button>
                )}
              </>
            )}

            <button className="btn b-quiet" type="button" onClick={later}>
              Plus tard
            </button>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
