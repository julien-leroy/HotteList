import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./brand";
import { scriptCanRender, scriptWidthEm } from "@/lib/script-metrics";
import { AvatarMenu } from "./avatar-menu";
import { NotificationBell } from "./notification-bell";
import type { CurrentUser } from "@/lib/auth";

const BULB_COLORS = ["#F2C65A", "#FF4A5C", "#5FB37C", "#6F8FD8", "#F2C65A", "#FF4A5C", "#5FB37C", "#E8823A"];

export function Garland({ count = 12, height = 58 }: { count?: number; height?: number }) {
  const bulbs = Array.from({ length: count }, (_, i) => ({
    c: BULB_COLORS[i % BULB_COLORS.length],
    cls: `bulb d${i % 4}`,
    top: Math.round(9 + 11 * Math.abs(Math.sin(((i + 0.5) * Math.PI) / 2.2))),
  }));
  return (
    <div aria-hidden="true" style={{ position: "relative", height }}>
      <svg width="100%" height={height} viewBox={`0 0 1200 ${height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M0 8 Q 50 34 100 8 T 200 8 T 300 8 T 400 8 T 500 8 T 600 8 T 700 8 T 800 8 T 900 8 T 1000 8 T 1100 8 T 1200 8"
          fill="none"
          stroke="#2B1A12"
          strokeWidth="2.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", padding: "0 20px" }}>
        {bulbs.map((b, i) => (
          <span key={i} className={b.cls} style={{ marginTop: b.top, background: b.c, boxShadow: `0 0 14px 3px ${b.c}99` }} />
        ))}
      </div>
    </div>
  );
}

/** Montagnes vert sapin + vague crème qui rejoint la page. */
export function Treeline({ fill = "#F7F1E3", height = 80 }: { fill?: string; height?: number }) {
  return (
    <svg
      aria-hidden="true"
      width="100%"
      viewBox="0 0 1200 80"
      preserveAspectRatio="xMidYMax slice"
      // La hauteur suit la largeur (rapport 1200 × 80) : les sommets ne sont jamais rognés sur grand écran.
      // Sur téléphone, on garde 80 px et ce sont les côtés qui sont coupés.
      style={{ position: "absolute", left: 0, right: 0, bottom: -1, display: "block", height: `max(${height}px, 6.667vw)`, zIndex: 0 }}
    >
      <path
        style={{ fill: "var(--hero-ridge, #1F4D36)" }}
        d="M0 80 L0 60 L30 30 L60 60 L80 40 L110 12 L140 46 L160 30 L190 58 L210 44 L240 20 L270 52 L300 60 L320 36 L350 8 L380 44 L400 34 L430 60 L460 40 L480 26 L510 54 L540 60 L560 30 L590 4 L620 40 L640 30 L670 58 L700 46 L720 22 L750 54 L780 60 L800 34 L830 10 L860 46 L880 36 L910 60 L940 42 L960 24 L990 52 L1020 60 L1040 32 L1070 6 L1100 42 L1120 32 L1150 58 L1180 40 L1200 26 L1200 80 Z"
      />
      <path fill={fill} d="M0 80 L0 72 Q 300 62 600 72 T 1200 72 L1200 80 Z" />
    </svg>
  );
}

/** Brin de houx placé devant les titres de listes. */
export function Holly({ size = 26 }: { size?: number }) {
  return (
    <svg className="holly" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 13c-2-5-8-6-10-3 2.5 0 3.5 1.5 3.3 3.3 1.8-.8 4.5 0 6.7-.3z" fill="#2E5741" />
      <path d="M12 13c4.6-2.4 5.6-8.4 2.8-10.6 0 2.5-1.6 3.4-3.4 3.2.8 1.8 0 4.6.6 7.4z" fill="#1F3A2C" />
      <circle cx="12" cy="14" r="2.4" fill="#CF2B35" />
      <circle cx="14.8" cy="15.6" r="2" fill="#E8525C" />
    </svg>
  );
}

/**
 * Fond des en-têtes. Vert sapin par défaut ; bordeaux en second, pour l'univers d'une famille
 * (page famille, années passées, invitation à la rejoindre).
 */
export type HeroTone = "bordeaux" | "sapin";

/** En-tête festif commun : guirlande, logo, navigation, puis le contenu du héros. */
export function FestiveHeader({
  user,
  current,
  tone = "sapin",
  children,
}: {
  user: CurrentUser;
  current?: "familles" | "profil" | "courses";
  tone?: HeroTone;
  children: ReactNode;
}) {
  const navLink = (href: string, label: string, short: string, key: string, hideOnMobile = false) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className={`px-1 py-2.5 text-[15px] font-semibold whitespace-nowrap no-underline${hideOnMobile ? " hidden sm:inline" : ""}`}
      style={{
        color: "#FFF9EE",
        textDecoration: current === key ? "underline" : "none",
        textDecorationColor: "#FFCB2E",
        textDecorationThickness: 2,
        textUnderlineOffset: 7,
      }}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{short}</span>
    </Link>
  );
  return (
    <section className={`hero hero-${tone} relative overflow-hidden`}>
      <Garland />
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 pt-1">
        <Link href="/familles" className="logo" aria-label="HotteList, mes familles">
          <Logo size={24} tone={tone === "sapin" ? "pine" : "bordeaux"} hideWordOnMobile />
        </Link>
        <nav className="flex items-center gap-3.5 sm:gap-[18px]" aria-label="Navigation">
          {navLink("/familles", "Mes familles", "Familles", "familles")}
          {navLink("/courses", "Mes courses", "Courses", "courses")}
          {navLink("/profil", "Mon profil", "Profil", "profil", true)}
          <NotificationBell />
          <AvatarMenu user={user} />
        </nav>
      </div>
      <div className="relative z-[1] mx-auto max-w-[1200px] px-6 pt-8 pb-[100px]">{children}</div>
      <Treeline />
    </section>
  );
}

/** Texte brut d'un titre, s'il n'est fait que de texte. */
function plainText(node: ReactNode): string | null {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(plainText);
    return parts.every((p) => p !== null) ? parts.join("") : null;
  }
  return null;
}

/**
 * Grand titre de page. En Santa Natale s'il tient sur une seule ligne (la taille s'adapte à la
 * largeur, voir --hero-room), sinon en Fraunces, plus sobre et lisible sur plusieurs lignes.
 * `text` : le texte du titre quand `children` n'est pas du texte brut (champ modifiable…).
 */
export function HeroTitle({ children, text, size = 84 }: { children: ReactNode; text?: string; size?: number }) {
  const t = text ?? plainText(children);
  const w = t === null ? null : scriptWidthEm(t) * 1.06;
  if (w !== null && w <= 9.2 && scriptCanRender(t!)) {
    return (
      <h1 className="hero-title" style={{ fontSize: `min(${size}px, calc(var(--hero-room) / ${w.toFixed(2)}))` }}>
        {children}
      </h1>
    );
  }
  return (
    <h1 className="hero-title-sober" style={{ fontSize: `clamp(32px, 5.4vw, ${Math.round(size * 0.62)}px)` }}>
      {children}
    </h1>
  );
}

const IcoGift = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-1.5-4-6-4.5-5.5-1.5C7 8 12 8 12 8zm0 0c1.5-4 6-4.5 5.5-1.5C17 8 12 8 12 8z" />
  </svg>
);
const IcoSecret = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <path d="M4 4l16 16" />
  </svg>
);
const IcoGroup = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14.5c1.8.9 3 2.9 3 5.5" />
  </svg>
);

/** Comment marche HotteList, en trois lignes. */
export function HowItWorks({ onLight = false }: { onLight?: boolean }) {
  return (
    <ul className={`steps${onLight ? " on-light" : ""}`}>
      <li>
        <span className="ico"><IcoGift /></span>
        <div><strong>Chacun écrit sa liste</strong><span>Un lien, une photo, un prix : on colle le lien et le cadeau se remplit tout seul.</span></div>
      </li>
      <li>
        <span className="ico"><IcoSecret /></span>
        <div><strong>Les autres réservent en secret</strong><span>Vous ne voyez jamais qui vous offre quoi : la surprise reste entière.</span></div>
      </li>
      <li>
        <span className="ico"><IcoGroup /></span>
        <div><strong>Ou se mettent à plusieurs</strong><span>Pour les gros cadeaux, on se regroupe et on s&apos;organise en commentaire.</span></div>
      </li>
    </ul>
  );
}

/** Présentation du site, sur le fond coloré des pages d'accueil. */
export function WelcomeAside({ title = "Les listes de Noël de toute la famille" }: { title?: string }) {
  return (
    <>
      <h1 className="hero-title-sober" style={{ fontSize: "clamp(34px, 4.2vw, 56px)", maxWidth: 600 }}>{title}</h1>
      <p className="hero-kicker auth-desktop-only" style={{ fontSize: 17, maxWidth: 520 }}>
        Fini les cadeaux en double et les listes qui circulent par message : tout le monde au même endroit, sans gâcher la surprise.
      </p>
      <div className="auth-desktop-only" style={{ maxWidth: 520 }}>
        <HowItWorks />
      </div>
    </>
  );
}

/**
 * Mise en page des écrans sans session (accueil, inscription, invitation, mot de passe…) :
 * à gauche la présentation sur fond sapin (bordeaux pour une invitation), à droite le formulaire. Sur téléphone, le fond coloré
 * passe en haut, en plus court, et le formulaire suit directement.
 */
export function AuthLayout({ aside, children, footer, tone = "sapin" }: { aside: ReactNode; children: ReactNode; footer?: ReactNode; tone?: HeroTone }) {
  return (
    <div className="auth">
      <section className={`auth-aside hero hero-${tone}`}>
        <Garland count={9} height={52} />
        <div className="auth-aside-inner">
          <Link href="/" className="logo" aria-label="HotteList, accueil">
            <Logo size={26} tone={tone === "sapin" ? "pine" : "bordeaux"} />
          </Link>
          {aside}
        </div>
        <Treeline />
      </section>
      <main className="auth-main">
        <div className="auth-panel">{children}</div>
        {footer && <div className="auth-panel auth-mobile-only" style={{ marginTop: 36 }}>{footer}</div>}
      </main>
    </div>
  );
}
