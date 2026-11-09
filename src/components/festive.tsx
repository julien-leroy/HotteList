import Link from "next/link";
import type { ReactNode } from "react";
import { IconGift } from "./icons";
import { Avatar } from "./avatar";
import { NotificationBell } from "./notification-bell";
import type { CurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

const BULB_COLORS = ["#F2C75C", "#E8414F", "#4FB37A", "#6FA8E8", "#F2C75C", "#E8414F", "#4FB37A", "#F28C3C"];

export function Garland({ count = 12, height = 54 }: { count?: number; height?: number }) {
  const bulbs = Array.from({ length: count }, (_, i) => ({
    c: BULB_COLORS[i % BULB_COLORS.length],
    cls: `bulb d${i % 4}`,
    top: Math.round(6 + 11 * Math.abs(Math.sin(((i + 0.5) * Math.PI) / 2.2))),
  }));
  return (
    <div aria-hidden="true" style={{ position: "relative", height }}>
      <svg width="100%" height={height} viewBox={`0 0 1200 ${height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M0 8 Q 50 34 100 8 T 200 8 T 300 8 T 400 8 T 500 8 T 600 8 T 700 8 T 800 8 T 900 8 T 1000 8 T 1100 8 T 1200 8"
          fill="none"
          stroke="#2B1A12"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", padding: "0 20px" }}>
        {bulbs.map((b, i) => (
          <span key={i} className={b.cls} style={{ marginTop: b.top, background: b.c, boxShadow: `0 0 12px 2px ${b.c}` }} />
        ))}
      </div>
    </div>
  );
}

export function Treeline({ fill = "#F7F1E3" }: { fill?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="100%"
      height="80"
      viewBox="0 0 1200 80"
      preserveAspectRatio="xMidYMax slice"
      style={{ position: "absolute", left: 0, right: 0, bottom: -1, display: "block" }}
    >
      <path
        fill="#1F4D36"
        d="M0 80 L0 60 L30 30 L60 60 L80 40 L110 12 L140 46 L160 30 L190 58 L210 44 L240 20 L270 52 L300 60 L320 36 L350 8 L380 44 L400 34 L430 60 L460 40 L480 26 L510 54 L540 60 L560 30 L590 4 L620 40 L640 30 L670 58 L700 46 L720 22 L750 54 L780 60 L800 34 L830 10 L860 46 L880 36 L910 60 L940 42 L960 24 L990 52 L1020 60 L1040 32 L1070 6 L1100 42 L1120 32 L1150 58 L1180 40 L1200 26 L1200 80 Z"
      />
      <path fill={fill} d="M0 80 L0 72 Q 300 62 600 72 T 1200 72 L1200 80 Z" />
    </svg>
  );
}

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <IconGift stroke={light ? "#F2C75C" : "#A8323C"} />
      <span className="font-display text-[26px] font-bold italic" style={{ color: light ? "#FFF9EE" : "#1F3A2C" }}>
        Hotte<span style={{ color: light ? "#F2C75C" : "#A8323C" }}>List</span>
      </span>
    </span>
  );
}

const heroBg = {
  backgroundColor: "#7E1621",
  backgroundImage:
    "radial-gradient(rgba(255,249,238,.22) 1.3px,transparent 1.8px),radial-gradient(rgba(255,249,238,.12) 1px,transparent 1.4px)",
  backgroundSize: "34px 34px,19px 19px",
  backgroundPosition: "0 0,9px 13px",
};

/** En-tête festif commun : guirlande, logo, navigation, puis le contenu du héros. */
export function FestiveHeader({
  user,
  current,
  children,
}: {
  user: CurrentUser;
  current?: "familles" | "profil";
  children: ReactNode;
}) {
  const navLink = (href: string, label: string, key: string) => (
    <Link
      href={href}
      aria-current={current === key ? "page" : undefined}
      className="px-1 py-2.5 text-[15px] font-semibold no-underline"
      style={{
        color: "#FFF9EE",
        textDecoration: current === key ? "underline" : "none",
        textDecorationColor: "#F2C75C",
        textUnderlineOffset: 6,
      }}
    >
      {label}
    </Link>
  );
  return (
    <section className="relative overflow-hidden text-ivoire" style={heroBg}>
      <Garland />
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 pt-1">
        <Link href="/familles" className="no-underline">
          <Logo />
        </Link>
        <nav className="flex items-center gap-3.5 sm:gap-[18px]" aria-label="Navigation">
          {navLink("/familles", "Mes familles", "familles")}
          {navLink("/profil", "Mon profil", "profil")}
          <NotificationBell />
          <form action={logout}>
            <button
              type="submit"
              title={`Connecté·e en tant que ${user.firstName}. Se déconnecter`}
              aria-label="Se déconnecter"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0"
            >
              <Avatar person={user} size={40} style={{ border: "2px solid #F2C75C" }} />
            </button>
          </form>
        </nav>
      </div>
      <div className="relative z-[1] mx-auto max-w-[1200px] px-6 pt-8 pb-[100px]">{children}</div>
      <Treeline />
    </section>
  );
}

export function HeroTitle({ children, size = 66 }: { children: ReactNode; size?: number }) {
  return (
    <h1
      className="font-display m-0 font-bold italic"
      style={{ fontSize: `clamp(40px, 9vw, ${size}px)`, lineHeight: 0.95, letterSpacing: "-0.02em", textShadow: "0 3px 0 #5A1018" }}
    >
      {children}
    </h1>
  );
}

/** Fond crème pointillé + carte centrale (accueil, inscription, invitation). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: "#F7F1E3",
        backgroundImage: "radial-gradient(rgba(217,169,62,.22) 1.2px,transparent 1.6px)",
        backgroundSize: "28px 28px",
      }}
    >
      <header className="flex justify-center px-6 py-[22px]">
        <Link href="/" className="no-underline">
          <Logo light={false} />
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pt-2 pb-16">{children}</main>
    </div>
  );
}

/** Bandeau rouge en haut d'une carte d'authentification. */
export function CardHero({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden text-center text-ivoire" style={{ ...heroBg, backgroundSize: "30px 30px" }}>
      <Garland count={10} height={46} />
      <div className="relative z-[1] flex flex-col items-center gap-3.5 px-8 pt-[18px] pb-[84px]">{children}</div>
      <svg aria-hidden="true" width="100%" height="70" viewBox="0 0 540 70" preserveAspectRatio="xMidYMax slice" style={{ position: "absolute", left: 0, right: 0, bottom: -1, display: "block" }}>
        <path fill="#1F4D36" d="M0 70 L0 50 L26 22 L52 50 L72 34 L100 6 L128 40 L148 26 L176 52 L198 36 L226 10 L254 44 L276 52 L298 28 L326 2 L354 38 L374 28 L402 52 L426 34 L448 14 L476 46 L500 52 L520 28 L540 10 L540 70 Z" />
        <path fill="#FFFDF7" d="M0 70 L0 62 Q 135 54 270 62 T 540 62 L540 70 Z" />
      </svg>
    </div>
  );
}
