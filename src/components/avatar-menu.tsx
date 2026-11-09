"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { logout } from "@/app/actions/auth";
import { Avatar, type AvatarPerson } from "./avatar";

/** Menu de l'avatar : profil, compte, déconnexion (plus de déconnexion au premier clic). */
export function AvatarMenu({ user }: { user: AvatarPerson & { login: string | null } }) {
  const [pending, start] = useTransition();
  const item = "menu-item no-underline";
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          aria-label={`Menu de ${user.firstName}`}
          className="cursor-pointer rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or-clair"
        >
          <Avatar person={user} size={40} style={{ border: "2px solid #F2C75C" }} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" align="end" sideOffset={8}>
          <div className="flex items-center gap-2.5 px-3 pt-2 pb-2.5" style={{ borderBottom: "2px dotted #D9A93E", marginBottom: 4 }}>
            <Avatar person={user} size={34} />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold text-encre">{user.firstName} {user.lastName ?? ""}</span>
              {user.login && <span className="truncate text-xs text-gris-clair">{user.login}</span>}
            </span>
          </div>
          <Dropdown.Item asChild className={item}>
            <Link href="/profil" style={{ color: "#1F3A2C" }}>Mon profil</Link>
          </Dropdown.Item>
          <Dropdown.Item asChild className={item}>
            <Link href="/familles" style={{ color: "#1F3A2C" }}>Mes familles</Link>
          </Dropdown.Item>
          <Dropdown.Item asChild className={item}>
            <Link href="/profil#compte" style={{ color: "#1F3A2C" }}>Mon compte</Link>
          </Dropdown.Item>
          <Dropdown.Separator style={{ height: 1, background: "#E3D6BA", margin: "4px 6px" }} />
          <Dropdown.Item
            className="menu-item"
            style={{ color: "#8A2730" }}
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              start(() => logout());
            }}
          >
            {pending ? "Déconnexion…" : "Se déconnecter"}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
