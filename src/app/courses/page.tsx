import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { personSelect } from "@/lib/queries";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { ShoppingList, type ShoppingItem } from "@/components/shopping-list";

export const metadata = { title: "Ma liste de courses" };

export default async function Courses() {
  const user = await requireUser("/courses");

  // Tout ce que j'offre (seul ou à plusieurs), dans les familles dont je fais toujours partie
  const myFamilies = (await db.membership.findMany({ where: { userId: user.id }, select: { familyId: true } })).map((m) => m.familyId);
  const parts = await db.giftParticipant.findMany({
    where: { userId: user.id, gift: { archivedAt: null, deletedAt: null, familyId: { in: myFamilies } } },
    include: {
      gift: {
        include: {
          recipient: { select: personSelect },
          family: { select: { id: true, name: true, slug: true } },
          participants: { include: { user: { select: personSelect } } },
          _count: { select: { comments: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const items: ShoppingItem[] = parts.map((p) => ({
    giftId: p.giftId,
    title: p.gift.title,
    price: p.gift.price,
    url: p.gift.url,
    imageUrl: p.gift.imageUrl,
    siteOrigin: p.gift.siteOrigin,
    status: p.status as ShoppingItem["status"],
    group: p.gift.takeMode === "A_PLUSIEURS",
    others: p.gift.participants.filter((x) => x.userId !== user.id).map((x) => x.user.firstName),
    comments: p.gift._count.comments,
    recipient: p.gift.recipient,
    family: p.gift.family,
    changedSinceMine: p.gift.contentUpdatedAt > p.createdAt,
  }));

  const draws = await db.secretSantaAssignment.findMany({
    where: { giverId: user.id, santa: { familyId: { in: myFamilies } } },
    include: { receiver: { select: personSelect }, santa: { include: { family: { select: { name: true, slug: true } } } } },
  });

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user} current="courses">
        <div className="flex flex-col gap-2.5">
          <HeroTitle>Ma liste de courses</HeroTitle>
          <p className="m-0 text-base hero-soft">Tout ce que vous offrez, pour qui, et où vous en êtes. Vous seul voyez cette page.</p>
        </div>
      </FestiveHeader>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-7 pb-24">
        {draws.map((d) => (
          <p key={d.santaId} className="m-0 rounded-[18px] px-5 py-4 text-[15px]" style={{ background: "#FFF4E0", border: "2px dashed #D9A93E" }}>
            {d.revealedAt ? (
              <>
                <strong>Secret Santa dans {d.santa.family.name} :</strong> vous offrez à <strong>{d.receiver.firstName}</strong>
                {d.santa.budget ? ` (budget conseillé : ${d.santa.budget})` : ""}.{" "}
                <Link href={`/f/${d.santa.family.slug}#p-${d.receiver.id}`}>Voir sa liste</Link>
              </>
            ) : (
              // Pas encore découvert : le nom ne sort pas d'ici, la surprise se fait sur la page famille
              <>
                <strong>Secret Santa dans {d.santa.family.name} :</strong> le tirage est fait !{" "}
                <Link href={`/f/${d.santa.family.slug}`}>Découvrir à qui vous offrez un cadeau</Link>
              </>
            )}
          </p>
        ))}
        {items.length === 0 ? (
          <div className="panel flex flex-col gap-2 p-6">
            <h2 className="font-display m-0 text-2xl font-bold">Rien pour l&apos;instant</h2>
            <p className="m-0 text-gris">
              Quand vous réservez un cadeau ou participez à un cadeau à plusieurs, il apparaît ici. <Link href="/familles">Aller à mes familles</Link>
            </p>
          </div>
        ) : (
          <ShoppingList items={items} />
        )}
      </main>
    </div>
  );
}
