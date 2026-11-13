import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPlus = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconEdit = (p: P) => <Svg strokeWidth={2} {...p}><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></Svg>;
export const IconClose = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconLink = (p: P) => <Svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>;
export const IconBookmark = (p: P) => <Svg {...p}><path d="M6 3h12v18l-6-4-6 4z" /></Svg>;
export const IconGroup = (p: P) => <Svg {...p}><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18.5 14.5c1.8.9 3 2.9 3 5.5" /></Svg>;
export const IconDownload = (p: P) => <Svg strokeWidth={2} {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Svg>;
export const IconExternal = (p: P) => <Svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>;
export const IconHidden = (p: P) => <Svg strokeWidth={1.8} {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><path d="M4 4l16 16" /></Svg>;
export const IconGrid = (p: P) => <Svg strokeWidth={2} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>;
export const IconList = (p: P) => <Svg strokeWidth={2} {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Svg>;
export const IconMove = (p: P) => <Svg strokeWidth={1.8} {...p}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" /></Svg>;
export const IconDots = (p: P) => <Svg {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg>;
export const IconBell = (p: P) => <Svg strokeWidth={1.8} {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" /></Svg>;
export const IconSettings = (p: P) => <Svg strokeWidth={1.8} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
export const IconStar = ({ size = 16, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.3 6.2 19.8l1.6-6.6L2.6 8.8l6.8-.5z" />
  </svg>
);
export const IconComment = ({ size = 13, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
  </svg>
);
export const IconGrip = ({ size = 16, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);
/** Le cadeau du favicon : couvercle, boîte, ruban et nœud (dessin d'origine en 64 unités). */
export const GIFT_64 = (
  <>
    <rect x="12" y="24" width="40" height="10" rx="2.5" />
    <path d="M15.5 34v15.5a2.5 2.5 0 0 0 2.5 2.5h28a2.5 2.5 0 0 0 2.5-2.5V34" />
    <path d="M32 24v28" />
    <path d="M32 24c-2.5-7.5-12.5-10-12.5-4 0 4 12.5 4 12.5 4zm0 0c2.5-7.5 12.5-10 12.5-4 0 4-12.5 4-12.5 4z" />
  </>
);

export const IconGift = ({ size = 30, strokeWidth = 1.6, stroke = "currentColor", ...p }: P) => (
  <svg width={size} height={size} viewBox="9 10 46 46" fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <g strokeWidth={Number(strokeWidth) * 2.6}>{GIFT_64}</g>
  </svg>
);
