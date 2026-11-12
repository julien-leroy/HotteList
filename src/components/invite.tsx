import { AuthLayout, HowItWorks } from "./festive";
import { Avatar, type AvatarPerson } from "./avatar";
import { SignupForm } from "./auth-forms";
import { JoinButton } from "./join-button";
import { eventDay, plural } from "@/lib/format";
import type { CurrentUser } from "@/lib/auth";

type Fam = {
  id: string;
  name: string;
  slug: string;
  eventName: string;
  eventDate: Date;
  createdBy: AvatarPerson;
  memberships: { user: AvatarPerson & { id: string } }[];
};

function InviteAside({ family, lead }: { family: Fam; lead: string }) {
  const people = family.memberships.map((m) => m.user);
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex">
          {people.slice(0, 4).map((p, i) => (
            <Avatar key={p.id} person={p} size={46} style={{ marginLeft: i ? -10 : 0, border: "3px solid #7E1621", fontSize: 15 }} />
          ))}
          {people.length > 4 && (
            <span className="av" style={{ width: 46, height: 46, marginLeft: -10, background: "#1F4D36", border: "3px solid #7E1621", fontSize: 15 }}>
              +{people.length - 4}
            </span>
          )}
        </div>
        <p className="hero-kicker" style={{ fontSize: 17 }}>{lead}</p>
      </div>
      <h1 className="hero-title" style={{ fontSize: "clamp(52px, 7vw, 84px)" }}>{family.name}</h1>
      <p className="hero-kicker">
        {plural(people.length, "membre", "membres")} · {family.eventName}, {eventDay(family.eventDate)}
      </p>
    </>
  );
}

/** Visiteur non connecté arrivant par le lien de la famille. */
export function InvitePage({ family, mail }: { family: Fam; mail: boolean }) {
  const next = `/f/${family.slug}`;
  return (
    <AuthLayout aside={<InviteAside family={family} lead={`${family.createdBy.firstName} vous invite à rejoindre`} />} footer={<HowItWorks onLight />}>
      <div>
        <h2>Rejoindre {family.name}</h2>
        <p className="lead">Créez votre compte pour voir les listes de chacun, réserver un cadeau ou participer à un cadeau à plusieurs.</p>
      </div>
      <div className="auth-card">
        <SignupForm next={next} joinFamilyId={family.id} submitLabel={`Rejoindre ${family.name}`} mail={mail} />
      </div>
      <p className="m-0 text-center text-[13px] leading-normal text-gris-clair">
        Après l&apos;inscription, vous pourrez aussi créer des comptes pour vos enfants depuis votre profil.
      </p>
    </AuthLayout>
  );
}

/** Utilisateur connecté qui n'est pas encore membre. */
export function JoinPage({ family, user, managed }: { family: Fam; user: CurrentUser; managed: (AvatarPerson & { id: string })[] }) {
  return (
    <AuthLayout aside={<InviteAside family={family} lead={`${user.firstName}, ${family.createdBy.firstName} vous invite à rejoindre`} />}>
      <div>
        <h2>Rejoindre {family.name}</h2>
        <p className="lead">Un clic, et vous voyez les listes de toute la famille.</p>
      </div>
      <div className="auth-card">
        <JoinButton familyId={family.id} familyName={family.name} managed={managed} />
      </div>
    </AuthLayout>
  );
}
