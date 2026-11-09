import { AuthShell, CardHero } from "./festive";
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

function Hero({ family, lead }: { family: Fam; lead: string }) {
  const people = family.memberships.map((m) => m.user);
  return (
    <CardHero>
      <div className="flex">
        {people.slice(0, 3).map((p, i) => (
          <Avatar key={p.id} person={p} size={46} style={{ marginLeft: i ? -10 : 0, border: "3px solid #7E1621", fontSize: 15 }} />
        ))}
        {people.length > 3 && (
          <span className="av" style={{ width: 46, height: 46, marginLeft: -10, background: "#1F4D36", border: "3px solid #7E1621", fontSize: 15 }}>
            +{people.length - 3}
          </span>
        )}
      </div>
      <p className="m-0 text-[15px] text-[#F6D9D2]">{lead}</p>
      <h1 className="font-display m-0 font-bold italic" style={{ fontSize: "clamp(36px,8vw,50px)", lineHeight: 1, letterSpacing: "-0.02em", textShadow: "0 3px 0 #5A1018" }}>
        {family.name}
      </h1>
      <span className="inline-flex items-center gap-2 rounded-full bg-or-clair px-3 py-[5px] text-[13px] font-bold text-bordeaux-fonce">
        {plural(people.length, "membre", "membres")} · {family.eventName}, {eventDay(family.eventDate)}
      </span>
    </CardHero>
  );
}

const cardStyle = { boxShadow: "0 30px 60px -36px rgba(90,20,25,.55)" };

/** Visiteur non connecté arrivant par le lien de la famille. */
export function InvitePage({ family }: { family: Fam }) {
  const next = `/f/${family.slug}`;
  return (
    <AuthShell>
      <div className="w-full max-w-[540px] overflow-hidden rounded-[26px] border border-sable bg-papier" style={cardStyle}>
        <Hero family={family} lead={`${family.createdBy.firstName} vous invite à rejoindre`} />
        <div className="flex flex-col gap-[18px] px-8 pt-7 pb-8">
          <p className="m-0 text-base leading-relaxed text-gris">
            Créez votre compte pour voir les listes de chacun, réserver un cadeau ou participer à un cadeau à plusieurs.
          </p>
          <SignupForm next={next} joinFamilyId={family.id} submitLabel={`Rejoindre ${family.name}`} loginHref={`/?next=${encodeURIComponent(next)}`} />
          <p className="m-0 text-center text-[13px] leading-normal text-gris-clair">
            Après l&apos;inscription, vous pourrez aussi créer des comptes pour vos enfants depuis votre profil.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}

/** Utilisateur connecté qui n'est pas encore membre. */
export function JoinPage({ family, user, managed }: { family: Fam; user: CurrentUser; managed: (AvatarPerson & { id: string })[] }) {
  return (
    <AuthShell>
      <div className="w-full max-w-[540px] overflow-hidden rounded-[26px] border border-sable bg-papier" style={cardStyle}>
        <Hero family={family} lead={`${user.firstName}, ${family.createdBy.firstName} vous invite à rejoindre`} />
        <div className="px-8 pt-7 pb-8">
          <JoinButton familyId={family.id} familyName={family.name} managed={managed} />
        </div>
      </div>
    </AuthShell>
  );
}
