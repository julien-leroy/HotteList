import { listTitleProps } from "@/lib/script-metrics";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { Avatar } from "@/components/avatar";
import { CreateFamilyForm } from "@/components/create-family-form";
import { daysUntil, defaultEventDate, isEventOver, parisDay } from "@/lib/utils";
import { plural } from "@/lib/format";
import { mailEnabled } from "@/lib/mail";

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
          _count: { select: { gifts: { where: { archivedAt: null, deletedAt: null, kind: "SOUHAIT" } } } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user} current="familles">
        <div className="flex flex-col gap-2.5">
          <HeroTitle>Bonjour {user.firstName}{"\u00a0!"}</HeroTitle>
          <p className="hero-kicker text-base">Vos familles, et de quoi en créer une nouvelle.</p>
        </div>
      </FestiveHeader>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 pt-7 pb-24">
        {(user.guest || (mailEnabled() && !user.hasEmail)) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-5 py-4" style={{ background: "#F8EDD2", border: "1px solid #E5CF96" }}>
            <p className="m-0 flex-[1_1_320px] text-[15px] leading-normal text-[#4A3810]">
              {user.guest ? (
                <><strong>Créez votre compte</strong> pour créer votre propre famille, gérer votre profil et recevoir les notifications par e-mail.</>
              ) : (
                <><strong>Confirmez votre adresse e-mail</strong> pour créer une famille, être admin, récupérer votre mot de passe tout seul ou vous connecter avec un code.</>
              )}
            </p>
            <Link className="btn b-gold" href={user.guest ? "/creer-mon-compte" : "/profil#compte"}>{user.guest ? "Créer mon compte" : "Ajouter mon e-mail"}</Link>
          </div>
        )}
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
                style={{ color: "#1F3A2C", borderTop: "6px solid #CF2B35" }}
              >
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-or-pale px-3 py-1 text-[13px] font-bold text-[#5C4214]">
                      {over ? `${family.eventName} : terminé` : days === 0 ? `${family.eventName} : c'est aujourd'hui !` : `${family.eventName} · J-${days}`}
                    </span>
                    {role === "ADMIN" && <span className="text-xs font-bold tracking-wide text-gris-clair uppercase">Admin</span>}
                  </div>
                  <h2 {...listTitleProps(family.name, 46, 280)}>{family.name}</h2>
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
          {user.verified ? (
            <CreateFamilyForm first={memberships.length === 0} christmas={parisDay(defaultEventDate())} today={parisDay(new Date())} />
          ) : (
            <div
              className="flex flex-col justify-center gap-3 rounded-[18px] p-6"
              style={{ border: "2px dashed #D9A93E", background: "repeating-linear-gradient(45deg,#FFF9EE 0 14px,#FBF1DC 14px 28px)", minHeight: 230 }}
            >
              <h2 className="font-display m-0 text-2xl font-bold text-[#8A1C26]">Créer une famille</h2>
              <p className="m-0 text-[15px] leading-normal text-gris">
                {user.guest ? "Il faut un compte pour créer une famille et en être l'admin." : "Il faut une adresse e-mail confirmée pour créer une famille et en être l'admin."}
              </p>
              <Link className="btn b-primary self-start" href={user.guest ? "/creer-mon-compte?next=/familles" : "/profil#compte"}>
                {user.guest ? "Créer mon compte" : "Confirmer mon e-mail"}
              </Link>
            </div>
          )}
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
