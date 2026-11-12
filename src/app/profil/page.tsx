import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadVisibleGifts, personSelect } from "@/lib/queries";
import { FestiveHeader, HeroTitle } from "@/components/festive";
import { ProfileBoard, type Column } from "@/components/profile-board";
import { ManagedPanel } from "@/components/managed-panel";
import { AccountPanel } from "@/components/account-panel";
import { mailEnabled } from "@/lib/mail";

export const metadata = { title: "Mon profil" };

export default async function Profil({ searchParams }: { searchParams: Promise<{ pour?: string }> }) {
  const user = await requireUser("/profil");
  const { pour } = await searchParams;
  const personId = pour && user.managedIds.includes(pour) ? pour : user.id;

  const [managed, myFamilies, personMemberships] = await Promise.all([
    db.user.findMany({ where: { id: { in: user.managedIds } }, select: personSelect, orderBy: { createdAt: "asc" } }),
    db.membership.findMany({ where: { userId: user.id }, include: { family: true }, orderBy: { joinedAt: "asc" } }),
    db.membership.findMany({ where: { userId: personId }, include: { family: true }, orderBy: { joinedAt: "asc" } }),
  ]);

  // Une colonne par famille où la personne est inscrite (et où je suis aussi, pour un compte géré)
  const myFamilyIds = new Set(myFamilies.map((m) => m.familyId));
  const families = personMemberships.filter((m) => myFamilyIds.has(m.familyId)).map((m) => m.family);
  const columns: Column[] = await Promise.all(
    families.map(async (f) => ({
      family: { id: f.id, name: f.name, slug: f.slug },
      gifts: (await loadVisibleGifts(user, f.id, [personId])).filter((g) => g.kind === "SOUHAIT"),
    })),
  );

  const person = personId === user.id ? { id: user.id, firstName: user.firstName, lastName: user.lastName, avatarColor: user.avatarColor } : managed.find((m) => m.id === personId)!;
  const managedFamilies = Object.fromEntries(
    await Promise.all(
      managed.map(async (m) => [m.id, (await db.membership.findMany({ where: { userId: m.id }, select: { familyId: true } })).map((x) => x.familyId)] as const),
    ),
  );

  const [meRow, pending] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, emailVerifiedAt: true, emailReminders: true, emailMentions: true } }),
    db.emailCode.findFirst({
      where: { userId: user.id, purpose: "VERIFY", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { email: true },
    }),
  ]);
  const account = {
    firstName: user.firstName,
    lastName: user.lastName,
    login: user.login,
    email: meRow.emailVerifiedAt ? meRow.email : null,
    pendingEmail: pending?.email ?? null,
    reminders: meRow.emailReminders,
    mentions: meRow.emailMentions,
  };

  return (
    <div className="min-h-screen bg-creme">
      <FestiveHeader user={user} current="profil" tone="sapin">
        <div className="flex flex-col gap-2.5">
          <HeroTitle>Mon profil</HeroTitle>
          <p className="m-0 text-base hero-soft">Vos listes dans chaque famille, et les comptes que vous gérez.</p>
        </div>
      </FestiveHeader>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-7 pb-24">
        <ManagedPanel
          me={{ id: user.id, firstName: user.firstName, lastName: user.lastName, avatarColor: user.avatarColor }}
          managed={managed}
          currentId={personId}
          families={myFamilies.map((m) => ({ id: m.family.id, name: m.family.name }))}
          managedFamilies={managedFamilies}
        />
        <ProfileBoard key={personId} person={person} isSelf={personId === user.id} columns={columns} />
        {personId === user.id && <AccountPanel {...account} mail={mailEnabled()} />}
      </main>
    </div>
  );
}
