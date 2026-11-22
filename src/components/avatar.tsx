import type { CSSProperties } from "react";
import { initials } from "@/lib/format";
import { avatarBackground, avatarSrc } from "@/lib/avatars";

export type AvatarPerson = {
  firstName: string;
  lastName?: string | null;
  avatarColor: string;
  /** personnage choisi (« 07 »), sinon initiales */
  avatar?: string | null;
  /** fond du cercle (clé de AVATAR_BACKGROUNDS) */
  avatarBg?: string | null;
};

/**
 * Avatar rond : le personnage choisi sur son fond, sinon les initiales sur la couleur du compte.
 * `bare` : le personnage seul, sans fond ni cercle (commentaires).
 */
export function Avatar({ person, size = 32, style, bare = false }: { person: AvatarPerson; size?: number; style?: CSSProperties; bare?: boolean }) {
  if (person.avatar) {
    return (
      <span
        className="av av-img"
        aria-hidden="true"
        style={{ width: size, height: size, background: bare ? "transparent" : avatarBackground(person.avatarBg), ...(bare ? { borderRadius: 0 } : {}), ...style }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc(person.avatar)} alt="" width={size} height={size} loading="lazy" draggable={false} />
      </span>
    );
  }
  return (
    <span
      className="av"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)), background: person.avatarColor, ...style }}
    >
      {initials(person.firstName, person.lastName)}
    </span>
  );
}
