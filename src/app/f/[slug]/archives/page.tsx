import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { personSelect, familyNicknames, withNickname, requireMember } from "@/lib/queries";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { Avatar } from "@/components/avatar";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Années passées" };

export default async function Archives({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/f/${slug}/archives`);
  const family = await db.family.findUnique({ where: { slug } });
  if (!family) notFound();
  await requireMember(user.id, family.id);

  const rawGifts = await db.gift.findMany({
    where: { familyId: family.id, archivedAt: { not: null }, deletedAt: null },
    include: { recipient: { select: personSelect }, participants: { include: { user: { select: personSelect } } } },
    orderBy: [{ archivedAt: "desc" }, { recipientId: "asc" }, { position: "asc" }],
  });
  const names = await familyNicknames(family.id);
  const gifts = rawGifts.map((g) => ({
    ...g,
    recipient: withNickname(g.recipient, names),
    participants: g.participants.map((p) => ({ ...p, user: withNickname(p.user, names) })),
  }));

  // Par année, puis par personne. Sur ses propres cadeaux, on ne montre pas qui les a offerts.
  // Une section par événement passé (« Noël 2026 », « Anniversaire de Léa 2027 »…)
  const years = new Map<string, Map<string, { person: (typeof gifts)[number]["recipient"]; gifts: typeof gifts }>>();
  for (const g of gifts) {
    const y = `${g.archiveEvent ?? "Noël"} ${g.archiveYear ?? g.archivedAt!.getFullYear()}`;
    const byPerson = years.get(y) ?? new Map();
    const entry = byPerson.get(g.recipientId) ?? { person: g.recipient, gifts: [] };
    entry.gifts.push(g);
    byPerson.set(g.recipientId, entry);
    years.set(y, byPerson);
  }

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user}>
        <div className="flex flex-col gap-2.5">
          <Link href={`/f/${family.slug}`} className="text-sm font-semibold no-underline" style={{ color: "var(--hero-soft)" }}>
            ← {family.name}
          </Link>
          <HeroTitle>Années passées</HeroTitle>
          <p className="m-0 text-base hero-soft">Ce qu&apos;on s&apos;est offert, année après année.</p>
        </div>
      </FestiveHeader>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 pt-7 pb-24">
        {years.size === 0 && <p className="m-0 text-gris">Rien d&apos;archivé pour l&apos;instant : ça arrive après « Nettoyer les listes ».</p>}
        {[...years.entries()].map(([year, people]) => (
          <section key={year} className="flex flex-col gap-5">
            <h2 className="font-display m-0 text-[44px] leading-none font-bold italic text-rouge">{year}</h2>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(320px,100%),1fr))" }}>
              {[...people.values()].map(({ person, gifts: list }) => (
                <div key={person.id} className="panel flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <Avatar person={person} size={40} />
                    <h3 className="font-display m-0 text-[22px] font-bold">{person.id === user.id ? "Pour moi" : `Pour ${person.firstName}`}</h3>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {list.map((g) => (
                      <li key={g.id} className="flex flex-col gap-0.5 rounded-xl bg-ivoire px-3 py-2" style={{ border: "1px solid #E3D6BA" }}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{g.title}</span>
                          <span className="tag">{formatPrice(g.price)}</span>
                        </span>
                        {g.recipientId !== user.id && g.participants.length > 0 && (
                          <span className="text-[13px] text-gris">Offert par {g.participants.map((p) => p.user.firstName).join(", ")}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
