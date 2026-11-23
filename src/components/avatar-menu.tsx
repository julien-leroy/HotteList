"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { logout } from "@/app/actions/auth";
import { switchProfile } from "@/app/actions/guest";
import { Avatar, type AvatarPerson } from "./avatar";
import { confirmDialog } from "./toaster";

/** Menu de l'avatar : profil, compte, déconnexion (plus de déconnexion au premier clic). */
export function AvatarMenu({ user }: { user: AvatarPerson & { login: string | null; verified: boolean } }) {
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
          <Avatar person={user} size={40} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" align="end" sideOffset={8}>
          <div className="flex items-center gap-2.5 px-3 pt-2 pb-2.5" style={{ borderBottom: "2px dotted #D9A93E", marginBottom: 4 }}>
            <Avatar person={user} size={34} />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold text-encre">{user.firstName} {user.lastName ?? ""}</span>
              {user.login && <span className="truncate text-xs text-gris-clair">{user.login}</span>}
              {!user.verified && <span className="text-xs text-gris-clair">Sans compte HotteList</span>}
            </span>
          </div>
          {!user.verified && (
            <Dropdown.Item asChild className={item}>
              <Link href="/profil#compte" style={{ color: "#8A1C26", fontWeight: 700 }}>Créer mon compte</Link>
            </Dropdown.Item>
          )}
          <Dropdown.Item asChild className={item}>
            <Link href="/profil" style={{ color: "#1F3A2C" }}>Mon profil</Link>
          </Dropdown.Item>
          <Dropdown.Item asChild className={item}>
            <Link href="/familles" style={{ color: "#1F3A2C" }}>Mes familles</Link>
          </Dropdown.Item>
          <Dropdown.Item asChild className={item}>
            <Link href="/courses" style={{ color: "#1F3A2C" }}>Ma liste de courses</Link>
          </Dropdown.Item>
          {user.verified && (
            <Dropdown.Item asChild className={item}>
              <Link href="/profil#compte" style={{ color: "#1F3A2C" }}>Mon compte</Link>
            </Dropdown.Item>
          )}
          <Dropdown.Separator style={{ height: 1, background: "#E3D6BA", margin: "4px 6px" }} />
          {!user.verified && (
            <Dropdown.Item
              className="menu-item"
              style={{ color: "#1F3A2C" }}
              disabled={pending}
              onSelect={(e) => {
                e.preventDefault();
                start(() => switchProfile());
              }}
            >
              Changer de profil
            </Dropdown.Item>
          )}
          <Dropdown.Item
            className="menu-item"
            style={{ color: "#8A2730" }}
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              if (user.verified) return start(() => logout());
              // Sans compte HotteList, pas de mot de passe : il reviendra par le lien de la famille, en touchant son nom.
              void confirmDialog({
                title: "Se déconnecter ?",
                message: "Pour revenir, rouvrez le lien de la famille et touchez votre nom. Créez votre compte pour pouvoir vous reconnecter de partout.",
                confirmLabel: "Se déconnecter",
              }).then((ok) => ok && start(() => logout()));
            }}
          >
            {pending ? "Déconnexion…" : "Se déconnecter"}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
