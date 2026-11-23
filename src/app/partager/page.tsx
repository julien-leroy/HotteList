import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { SharePanel, type ShareFamily } from "@/components/share-panel";
import { readShare } from "@/lib/share";

export const metadata = { title: "Ajouter à ma liste" };

// Arrivée par « Partager » depuis une autre appli (manifeste : share_target).
// Les applis rangent l'adresse tantôt dans « url », tantôt au milieu du texte
// (« Découvrez … sur Fnac https://… ») : on la cherche partout.

type Search = { title?: string; text?: string; url?: string };

export default async function Partager({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const share = readShare(sp);
  const back = `/partager?${new URLSearchParams({ url: share.url, title: share.title }).toString()}`;
  const user = await requireUser(back);

  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { joinedAt: "desc" }],
    include: { family: { include: { memberships: { include: { user: true } } } } },
  });

  // Pour chaque famille : moi, et les comptes que je gère qui en font partie
  const families: ShareFamily[] = await Promise.all(
    memberships.map(async ({ family }) => {
      const people = [
        { id: user.id, label: "Ma liste" },
        ...family.memberships
          .filter((m) => user.managedIds.includes(m.userId))
          .map((m) => ({ id: m.userId, label: m.nickname || m.user.firstName })),
      ];
      const gifts = await db.gift.findMany({
        where: { familyId: family.id, recipientId: { in: people.map((p) => p.id) }, kind: "SOUHAIT", archivedAt: null, deletedAt: null },
        select: { title: true, url: true, recipientId: true },
      });
      return {
        id: family.id,
        slug: family.slug,
        name: family.name,
        people: people.map((p) => ({ ...p, existing: gifts.filter((g) => g.recipientId === p.id).map(({ title, url }) => ({ title, url })) })),
      };
    }),
  );

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user}>
        <div className="flex flex-col gap-2.5">
          <HeroTitle>Ajouter à ma liste</HeroTitle>
        </div>
      </FestiveHeader>
      <main className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 pt-5 pb-24 sm:px-6 sm:pt-7">
        {families.length === 0 ? (
          <div className="card flex flex-col gap-3 p-6">
            <p className="m-0 text-[15px]">Vous ne faites encore partie d&apos;aucune famille : ouvrez le lien qu&apos;on vous a envoyé, puis partagez de nouveau.</p>
            <Link className="btn b-primary self-start" href="/familles">Mes familles</Link>
          </div>
        ) : !share.url && !share.title ? (
          <div className="card flex flex-col gap-3 p-6">
            <p className="m-0 text-[15px]">Rien n&apos;a été reçu. Sur la page d&apos;un article, touchez « Partager » puis HotteList.</p>
            <Link className="btn b-primary self-start" href="/familles">Mes familles</Link>
          </div>
        ) : (
          <SharePanel families={families} prefill={share} />
        )}
      </main>
    </div>
  );
}
