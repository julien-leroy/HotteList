import type { CSSProperties } from "react";

/*
 * Identité HotteList : la hotte (sac de toile rouge, cadeau doré, lien vert noué d'or)
 * et le nom « Hotte » (Santa Natale) + « List » (Fraunces italique).
 * Dessin d'origine dans une boîte de 54 unités (viewBox 6 6 54 54).
 */

const SACK = "#CF2B35";
const FOLD = "#9E1A24";
const GIFT = "#FFD146";
const TIE = "#3F7A52";
const KNOT = "#FFCB2E";
const SHADOW = "#6E0B14";
/** Couleurs inversées, pour les fonds bordeaux : sac sapin, lien rouge vif (cadeau et nœud restent dorés). */
const INV = { sack: "#2A6B4B", fold: "#1A4A33", tie: "#FF4A55", shadow: "#0B2A1B" };

const SACK_PATH =
  "M27 24C23 22 19 18 20 13c1-3 5-2 7 1 1-5 7-6 8-1 2-3 7-2 6 3-1 4-4 6-7 7C43 26.5 50 35 52 44c1.8 8-1 13.2-8 14-8 1-20 1-27 0-6.2-.9-8.2-6.6-5.2-13.6 3.2-7.8 8.2-16.4 15.2-20.4z";
const FOLDS = "M18 42c-2 4-2 9 0 12M45.5 38c2 4 2.5 9 1 13M29.5 22.5c-.6-2.2-1.4-4.4-2.8-6.6M32.6 22c.4-2.2.6-4.6.2-7";
const LID = "M24.5 37h17v5h-17z";
const BOX = "M26 42h14v10.5H26z";
const RIB = "M33 37v15.5";
const BOW = "M33 37c-2-4.6-7.6-4.6-6.6-1 .8 2.2 6.6 1 6.6 1zm0 0c2-4.6 7.6-4.6 6.6-1-.8 2.2-6.6 1-6.6 1z";
const TIE_BAND = "M25 24.4C27.457 25.617 29.749 25.848 31.878 25.094 32.781 24.773 33.656 24.276 34.5 23.6";
const TIE_ENDS = "M34.5 23.6C38 25.1 41.047 28.181 41.047 32.681M34.5 23.6C39.5 23.1 43 25.6 44.5 29.6";

function GiftShapes() {
  return (
    <>
      <path d={LID} />
      <path d={BOX} />
      <path d={RIB} />
      <path d={BOW} />
    </>
  );
}

/**
 * La hotte seule.
 * `simple` : version petite taille (favicon, 16–32 px) : sans plis, cadeau plein, traits épaissis.
 */
export function HotteMark({
  size = 48,
  simple = size <= 32,
  inverse = false,
  title,
  className,
  style,
}: {
  size?: number;
  simple?: boolean;
  /** Version pour fond bordeaux (couleurs inversées). */
  inverse?: boolean;
  title?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const sw = simple ? 4.6 : size >= 120 ? 2.6 : size >= 64 ? 2.9 : 3.2;
  const tw = simple ? sw * 0.8 : sw;
  const layers = simple ? 4 : 7;
  const sack = inverse ? INV.sack : SACK;
  const fold = inverse ? INV.fold : FOLD;
  const tie = inverse ? INV.tie : TIE;
  const shadow = inverse ? INV.shadow : SHADOW;
  return (
    <svg
      width={size}
      height={size}
      viewBox="6 6 54 54"
      className={className}
      style={{ flex: "none", ...style }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={SACK_PATH} fill={sack} />
      {!simple && <path d={FOLDS} fill="none" stroke={fold} strokeWidth={1.7} strokeLinecap="round" />}
      <g transform="translate(-1 0.5) rotate(-6 33 45)">
        {/* Ombre floue sous le cadeau : couches de plus en plus larges et transparentes */}
        <g transform="translate(0.35 1.15)" fill="none" stroke={shadow} strokeLinecap="round" strokeLinejoin="round">
          {Array.from({ length: layers }, (_, k) => (
            <g key={k} strokeOpacity={simple ? 0.075 : 0.055} strokeWidth={(simple ? sw * 1.6 : sw) + 0.7 + k * (simple ? 0.9 : 0.75)}>
              <GiftShapes />
            </g>
          ))}
        </g>
        {simple ? (
          <>
            <path d={LID} fill={GIFT} />
            <path d={BOX} fill={GIFT} />
            <g fill="none" stroke={sack} strokeWidth={sw * 0.8}>
              <path d={RIB} />
              <path d="M24.5 42h17" />
            </g>
            <path d={BOW} fill="none" stroke={GIFT} strokeWidth={sw} strokeLinejoin="round" />
          </>
        ) : (
          <g fill="none" stroke={GIFT} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
            <GiftShapes />
          </g>
        )}
      </g>
      <path d={TIE_BAND} fill="none" stroke={tie} strokeWidth={tw * 1.15} strokeLinecap="round" />
      <path d={TIE_ENDS} fill="none" stroke={tie} strokeWidth={tw * 0.95} strokeLinecap="round" />
      <circle cx="34.5" cy="23.6" r={tw * 1.25} fill={KNOT} />
    </svg>
  );
}

type Tone = "light" | "bordeaux" | "pine";

const WORD_COLORS: Record<Tone, [string, string]> = {
  light: ["var(--color-rouge)", "var(--color-encre)"],
  bordeaux: ["var(--color-ivoire)", "var(--color-or-clair)"],
  pine: ["var(--color-rouge-vif)", "var(--color-or-clair)"],
};

/** Le nom : « Hotte » manuscrit + « List » en italique. `size` = taille de référence en px. */
export function Wordmark({ size = 26, tone = "light" }: { size?: number; tone?: Tone }) {
  const [hotte, list] = WORD_COLORS[tone];
  return (
    <span className="wordmark" aria-hidden="true" style={{ gap: size * 0.18 }}>
      <span className="font-script" style={{ fontSize: size * 1.3, color: hotte }}>Hotte</span>
      <span className="font-brand" style={{ fontSize: size * 0.92, color: list }}>List</span>
    </span>
  );
}

/**
 * Logo complet. Hotte classique (sac rouge, lien vert) sur crème et sapin ; sur bordeaux,
 * couleurs inversées (sac sapin, lien rouge vif). Le cadeau jaune seul est réservé aux icônes.
 */
export function Logo({ size = 26, tone = "light", hideWordOnMobile = false }: { size?: number; tone?: Tone; hideWordOnMobile?: boolean }) {
  const mark = <HotteMark size={Math.round(size * 1.6)} inverse={tone === "bordeaux"} />;
  return (
    <span className="logo" style={{ gap: size * 0.32 }}>
      {mark}
      <span className={hideWordOnMobile ? "hidden sm:inline-flex" : "inline-flex"}>
        <Wordmark size={size} tone={tone} />
      </span>
      <span className="sr-only">HotteList</span>
    </span>
  );
}
