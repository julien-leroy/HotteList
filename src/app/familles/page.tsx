import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { Avatar } from "@/components/avatar";
import { CreateFamilyForm } from "@/components/create-family-form";
import { daysUntil, isEventOver } from "@/lib/utils";
import { plural } from "@/lib/format";

export const metadata = { title: "Mes familles" };

export default async function Familles() {
  const user = await requireUser("/familles");
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: {
      family: {
        include: {
          memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
          _count: { select: { gifts: { where: { archivedAt: null, kind: "SOUHAIT" } } } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user} current="familles">
        <div className="flex flex-col gap-2.5">
          <HeroTitle>Bonjour {user.firstName} !</HeroTitle>
          <p className="m-0 text-base text-[#F6D9D2]">Vos familles, et de quoi en créer une nouvelle.</p>
        </div>
      </FestiveHeader>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pt-7 pb-24">
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(320px,100%),1fr))" }}>
          {memberships.map(({ family, role }) => {
            const days = daysUntil(family.eventDate);
            const over = isEventOver(family.eventDate);
            const people = family.memberships.map((m) => m.user);
            return (
              <Link
                key={family.id}
                href={`/f/${family.slug}`}
                className="card no-underline"
                style={{ color: "#1F3A2C", borderTop: "6px solid #B3202E" }}
              >
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-or-pale px-3 py-1 text-[13px] font-bold text-[#5C4214]">
                      {over ? "Événement terminé" : days === 0 ? "C'est aujourd'hui !" : `J-${days}`}
                    </span>
                    {role === "ADMIN" && <span className="text-xs font-bold tracking-wide text-gris-clair uppercase">Admin</span>}
                  </div>
                  <h2 className="font-display m-0 text-[32px] leading-[1.05] font-bold italic">{family.name}</h2>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex">
                      {people.slice(0, 5).map((p, i) => (
                        <Avatar key={p.id} person={p} size={36} style={{ marginLeft: i ? -8 : 0, border: "2px solid #FFFDF7" }} />
                      ))}
                      {people.length > 5 && (
                        <span className="av" style={{ width: 36, height: 36, marginLeft: -8, background: "#1F4D36", border: "2px solid #FFFDF7", fontSize: 12 }}>
                          +{people.length - 5}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gris">
                      {plural(people.length, "membre", "membres")} · {plural(family._count.gifts, "souhait", "souhaits")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          <CreateFamilyForm first={memberships.length === 0} />
        </div>
        {memberships.length === 0 && (
          <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-gris">
            Pour rejoindre la famille de quelqu&apos;un d&apos;autre, ouvrez simplement le lien qu&apos;on vous a envoyé.
          </p>
        )}
      </main>
    </div>
  );
}
