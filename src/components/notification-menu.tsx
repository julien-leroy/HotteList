"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBell } from "./icons";
import { markNotificationsRead } from "@/app/actions/gifts";
import { relativeDate } from "@/lib/format";

type Item = { id: string; text: string; link: string | null; unread: boolean; createdAt: string };

export function NotificationMenu({ items, emailHref }: { items: Item[]; emailHref: string | null }) {
  const unread = items.filter((i) => i.unread).length;
  const path = usePathname();
  // Après la création du compte, on revient sur la page où l'on était
  const href = emailHref?.startsWith("/creer-mon-compte") ? `${emailHref}&next=${encodeURIComponent(path)}` : emailHref;
  return (
    <Dropdown.Root
      onOpenChange={(open) => {
        if (!open && unread) void markNotificationsRead();
      }}
    >
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-ivoire hover:bg-white/10"
          aria-label={unread ? `${unread} notification(s) non lue(s)` : "Notifications"}
        >
          <IconBell size={22} />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-or-clair px-1 text-[11px] font-bold text-bordeaux-fonce">
              {unread}
            </span>
          )}
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu max-w-[340px]" align="end" sideOffset={8}>
          <div className="menu-label">Notifications</div>
          {items.length === 0 && <p className="m-0 px-3 py-2 text-sm text-gris">Rien de nouveau pour l&apos;instant.</p>}
          {items.map((n) => (
            <Dropdown.Item key={n.id} asChild className="menu-item !h-auto !items-start py-2.5">
              {n.link ? (
                <Link href={n.link} className="no-underline" style={{ color: "#1F3A2C" }}>
                  <Body n={n} />
                </Link>
              ) : (
                <div>
                  <Body n={n} />
                </div>
              )}
            </Dropdown.Item>
          ))}
          {emailHref && (
            <>
              <Dropdown.Separator style={{ height: 1, background: "#E3D6BA", margin: "4px 6px" }} />
              <Dropdown.Item asChild className="menu-item no-underline">
                <Link href={href!} style={{ color: "#8A1C26", fontWeight: 700 }}>Me notifier par e-mail</Link>
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function Body({ n }: { n: Item }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className={`text-sm leading-snug ${n.unread ? "font-semibold" : ""}`}>{n.text}</span>
      <span className="text-xs text-gris-clair">{relativeDate(n.createdAt)}</span>
    </span>
  );
}
