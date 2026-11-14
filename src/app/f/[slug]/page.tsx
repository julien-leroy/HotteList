import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadVisibleGifts, personSelect } from "@/lib/queries";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { IconStar } from "@/components/icons";
import { CopyLink } from "@/components/copy-link";
import { FamilyBoard, type Section } from "@/components/family-board";
import { FamilySettings } from "@/components/family-settings";
import { EventOver } from "@/components/event-over";
import { InvitePage, JoinPage } from "@/components/invite";
import { SantaAside } from "@/components/santa";
import { mailEnabled } from "@/lib/mail";
import { ShareButton } from "@/components/share-button";
import { FamilyNameEdit } from "@/components/family-name-edit";
import Link from "next/link";
import { daysUntil, isEventOver, parisDay } from "@/lib/utils";
import { eventDay, plural } from "@/lib/format";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ cadeau?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await db.family.findUnique({ where: { slug }, select: { name: true } });
  return { title: f?.name ?? "Famille" };
}

export default async function FamilyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { cadeau } = await searchParams;
  const family = await db.family.findUnique({
    where: { slug },
    include: {
      createdBy: { select: personSelect },
      memberships: { include: { user: { select: { ...personSelect, managedById: true, login: true } } }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!family) notFound();

  const user = await getCurrentUser();
  if (!user) return <InvitePage family={family} mail={mailEnabled()} />;

  const me = family.memberships.find((m) => m.userId === user.id);
  if (!me) {
    const managed = await db.user.findMany({ where: { id: { in: user.managedIds } }, select: personSelect });
    return <JoinPage family={family} user={user} managed={managed} />;
  }

  const isAdmin = me.role === "ADMIN";

  // Badge « Nouveau » : comparé à la visite précédente. Une « visite » se renouvelle après 1 h d'absence,
  // pour que les badges ne disparaissent pas au premier clic.
  const now = new Date();
  let since = me.prevSeenAt;
  if (!me.lastSeenAt || now.getTime() - me.lastSeenAt.getTime() > 3600_000) {
    since = me.lastSeenAt;
    await db.membership.update({ where: { id: me.id }, data: { prevSeenAt: me.lastSeenAt, lastSeenAt: now } });
  }
  const gifts = await loadVisibleGifts(user, family.id, undefined, since);

  // Tirage au sort : je ne charge que MON tirage
  const santa = await db.secretSanta.findFirst({
    where: { familyId: family.id },
    include: { assignments: { select: { giverId: true, revealedAt: true } } },
  });
  const myDraw = santa
    ? await db.secretSantaAssignment.findUnique({
        where: { santaId_giverId: { santaId: santa.id, giverId: user.id } },
        include: { receiver: { select: personSelect } },
      })
    : null;
  const archivedCount = await db.gift.count({ where: { familyId: family.id, archivedAt: { not: null }, deletedAt: null } });

  // Moi d'abord, puis mes comptes gérés, puis les autres dans l'ordre d'arrivée
  // Pseudo de chacun dans cette famille (sinon son prénom)
  const nick = new Map(family.memberships.filter((m) => m.nickname).map((m) => [m.userId, m.nickname!]));
  const shown = (u: { id: string; firstName: string; lastName: string | null }) => (nick.has(u.id) ? nick.get(u.id)! : u.firstName);
  // Secret Santa : la personne que j'ai tirée passe en premier, puis moi, mes comptes gérés, les autres
  // (seulement une fois découverte : avant, le nom ne quitte pas le serveur)
  const santaChild = family.santaMode && myDraw?.revealedAt ? myDraw.receiverId : null;
  const rank = (id: string) => (id === santaChild ? -1 : id === user.id ? 0 : user.managedIds.includes(id) ? 1 : 2);
  // Ceux qui n'ont encore aucun souhait passent après ceux qui en ont (sauf moi : c'est là que j'ajoute les miens)
  const hasWishes = new Set(gifts.filter((g) => g.kind === "SOUHAIT").map((g) => g.recipientId));
  const empty = (id: string) => (id !== user.id && id !== santaChild && !hasWishes.has(id) ? 1 : 0);
  const members = family.memberships.slice().sort((a, b) => empty(a.userId) - empty(b.userId) || rank(a.userId) - rank(b.userId));
  const sections: Section[] = members.map((m) => ({
    person: { id: m.user.id, firstName: shown(m.user), lastName: m.nickname ? null : m.user.lastName, avatarColor: m.user.avatarColor },
    realName: [m.user.firstName, m.user.lastName].filter(Boolean).join(" "),
    nickname: m.nickname,
    isMe: m.userId === user.id,
    isSantaChild: m.userId === santaChild,
    isManaged: user.managedIds.includes(m.userId),
    managerName: m.user.managedById
      ? (() => {
          const mgr = family.memberships.find((x) => x.userId === m.user.managedById)?.user;
          return mgr ? shown(mgr) : null;
        })()
      : null,
    gifts: gifts.filter((g) => g.recipientId === m.userId),
  }));

  // Participants possibles au Secret Santa : les membres qui ont leur propre compte
  const santaCandidates = family.memberships
    .filter((m) => !m.user.managedById)
    .map((m) => ({ id: m.user.id, firstName: shown(m.user), lastName: m.nickname ? null : m.user.lastName, avatarColor: m.user.avatarColor }));

  const drawnOn = santa ? santa.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }) : null;

  const wishCount = gifts.filter((g) => g.kind === "SOUHAIT").length;
  const over = isEventOver(family.eventDate);
  const days = daysUntil(family.eventDate);

  let recap: { taken: number; free: number } | null = null;
  if (over) {
    const [taken, free] = await Promise.all([
      db.gift.count({ where: { familyId: family.id, archivedAt: null, deletedAt: null, takeMode: { in: ["SEUL", "A_PLUSIEURS"] } } }),
      db.gift.count({ where: { familyId: family.id, archivedAt: null, deletedAt: null, takeMode: "AUCUN" } }),
    ]);
    recap = { taken, free };
  }

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const inviteUrl = `${appUrl}/f/${family.slug}`;
  const myManaged = await db.user.findMany({ where: { id: { in: user.managedIds } }, select: personSelect });

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user} tone="bordeaux">
        <div className="flex flex-wrap items-end justify-between gap-7 pb-0">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-ivoire">
                <IconStar className="text-or-clair" />
                {over ? `${family.eventName} : terminé` : days === 0 ? `${family.eventName} : c'est le grand jour !` : `${family.eventName} · ${eventDay(family.eventDate)} · J-${days}`}
              </span>
              <span className="text-[15px] hero-soft">· 
                {plural(family.memberships.length, "membre", "membres")} · {plural(wishCount, "souhait", "souhaits")}
              </span>
            </div>
            <HeroTitle size={76} text={family.name}>
              {isAdmin ? <FamilyNameEdit familyId={family.id} name={family.name} /> : family.name}
            </HeroTitle>
          </div>
          <div className="flex min-w-0 flex-[0_1_440px] flex-col gap-2">
            <span className="text-sm font-medium hero-soft">Lien de la famille, à envoyer à tout le monde</span>
            <CopyLink url={inviteUrl} />
            <div className="flex flex-wrap justify-end gap-2">
              <ShareButton url={inviteUrl} familyName={family.name} />
              {archivedCount > 0 && (
                <Link className="btn b-light" href={`/f/${family.slug}/archives`} style={{ minHeight: 40 }}>
                  Années passées
                </Link>
              )}
              <FamilySettings
                family={{ id: family.id, slug: family.slug, name: family.name, eventName: family.eventName, eventDate: parisDay(family.eventDate) }}
                today={parisDay(new Date())}
                isAdmin={isAdmin}
                meId={user.id}
                members={family.memberships.map((m) => ({
                  id: m.user.id,
                  firstName: m.user.firstName,
                  lastName: m.user.lastName,
                  nickname: m.nickname,
                  avatarColor: m.user.avatarColor,
                  role: m.role as "ADMIN" | "MEMBRE",
                  managed: Boolean(m.user.managedById),
                }))}
                myManaged={myManaged.map((p) => ({ ...p, inFamily: family.memberships.some((m) => m.userId === p.id) }))}
                santa={
                  isAdmin
                    ? {
                        mode: family.santaMode,
                        memberCount: santaCandidates.length,
                        current: santa
                          ? { budget: santa.budget, total: santa.assignments.length, revealed: santa.assignments.filter((a) => a.revealedAt).length, drawnOn: drawnOn! }
                          : null,
                      }
                    : null
                }
              />
            </div>
          </div>
        </div>
      </FestiveHeader>

      {recap && <EventOver eventName={family.eventName} familyId={family.id} isAdmin={isAdmin} taken={recap.taken} free={recap.free} />}

      <FamilyBoard
        familyId={family.id}
        familySlug={family.slug}
        viewerId={user.id}
        sections={sections}
        openGiftId={cadeau ?? null}
        aside={
          family.santaMode ? (
            <SantaAside
              familyId={family.id}
              isAdmin={isAdmin}
              memberCount={santaCandidates.length}
              pool={santaCandidates.filter((c) => c.id !== user.id && santa?.assignments.some((a) => a.giverId === c.id))}
              state={
                !santa
                  ? { kind: "none" }
                  : !myDraw
                    ? { kind: "outside" }
                    : !myDraw.revealedAt
                      ? { kind: "toDiscover" }
                      : {
                          kind: "revealed",
                          receiver: { ...myDraw.receiver, firstName: shown(myDraw.receiver), lastName: nick.has(myDraw.receiver.id) ? null : myDraw.receiver.lastName },
                          wishes: gifts.filter((g) => g.recipientId === myDraw.receiverId && g.kind === "SOUHAIT").length,
                        }
              }
              budget={santa?.budget ?? null}
              drawnOn={drawnOn}
            />
          ) : null
        }
      />
    </div>
  );
}
