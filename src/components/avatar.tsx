import type { CSSProperties } from "react";
import { initials } from "@/lib/format";

export type AvatarPerson = { firstName: string; lastName?: string | null; avatarColor: string };

export function Avatar({ person, size = 32, style }: { person: AvatarPerson; size?: number; style?: CSSProperties }) {
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
