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
import { daysUntil, isEventOver, parisDay } from "@/lib/utils";
import { plural } from "@/lib/format";

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
  if (!user) return <InvitePage family={family} />;

  const me = family.memberships.find((m) => m.userId === user.id);
  if (!me) {
    const managed = await db.user.findMany({ where: { id: { in: user.managedIds } }, select: personSelect });
    return <JoinPage family={family} user={user} managed={managed} />;
  }

  const isAdmin = me.role === "ADMIN";
  const gifts = await loadVisibleGifts(user, family.id);

  // Moi d'abord, puis mes comptes gérés, puis les autres dans l'ordre d'arrivée
  const rank = (id: string) => (id === user.id ? 0 : user.managedIds.includes(id) ? 1 : 2);
  const members = family.memberships.slice().sort((a, b) => rank(a.userId) - rank(b.userId));
  const sections: Section[] = members.map((m) => ({
    person: { id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName, avatarColor: m.user.avatarColor },
    isMe: m.userId === user.id,
    isManaged: user.managedIds.includes(m.userId),
    managerName: m.user.managedById
      ? family.memberships.find((x) => x.userId === m.user.managedById)?.user.firstName ?? null
      : null,
    gifts: gifts.filter((g) => g.recipientId === m.userId),
  }));

  const wishCount = gifts.filter((g) => g.kind === "SOUHAIT").length;
  const over = isEventOver(family.eventDate);
  const days = daysUntil(family.eventDate);

  let recap: { taken: number; free: number } | null = null;
  if (over) {
    const [taken, free] = await Promise.all([
      db.gift.count({ where: { familyId: family.id, archivedAt: null, takeMode: { in: ["SEUL", "A_PLUSIEURS"] } } }),
      db.gift.count({ where: { familyId: family.id, archivedAt: null, takeMode: "AUCUN" } }),
    ]);
    recap = { taken, free };
  }

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const inviteUrl = `${appUrl}/f/${family.slug}`;
  const myManaged = await db.user.findMany({ where: { id: { in: user.managedIds } }, select: personSelect });

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user}>
        <div className="flex flex-wrap items-end justify-between gap-7 pb-0">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full bg-or-clair px-3.5 py-1.5 text-sm font-bold text-bordeaux-fonce">
                <IconStar />
                {over ? "Événement terminé" : days === 0 ? "C'est le grand jour !" : `J-${days} avant le ${new Date(family.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`}
              </span>
              <span className="text-[15px] text-[#F6D9D2]">
                {plural(family.memberships.length, "membre", "membres")} · {plural(wishCount, "souhait", "souhaits")}
              </span>
            </div>
            <HeroTitle size={76}>{family.name}</HeroTitle>
          </div>
          <div className="flex min-w-0 flex-[0_1_440px] flex-col gap-2">
            <span className="text-sm font-medium text-[#F6D9D2]">Lien de la famille, à envoyer à tout le monde</span>
            <CopyLink url={inviteUrl} />
            <div className="flex justify-end">
              <FamilySettings
                family={{ id: family.id, name: family.name, eventDate: parisDay(family.eventDate) }}
                isAdmin={isAdmin}
                meId={user.id}
                members={family.memberships.map((m) => ({
                  id: m.user.id,
                  firstName: m.user.firstName,
                  lastName: m.user.lastName,
                  avatarColor: m.user.avatarColor,
                  role: m.role as "ADMIN" | "MEMBRE",
                  managed: Boolean(m.user.managedById),
                }))}
                myManaged={myManaged.map((p) => ({ ...p, inFamily: family.memberships.some((m) => m.userId === p.id) }))}
              />
            </div>
          </div>
        </div>
      </FestiveHeader>

      {recap && <EventOver familyId={family.id} isAdmin={isAdmin} taken={recap.taken} free={recap.free} />}

      <FamilyBoard
        familyId={family.id}
        familySlug={family.slug}
        viewerId={user.id}
        sections={sections}
        openGiftId={cadeau ?? null}
      />
    </div>
  );
}
