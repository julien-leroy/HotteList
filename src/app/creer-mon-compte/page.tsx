import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { AuthLayout } from "@/components/festive";
import { AccountUpgrade } from "@/components/account-upgrade";
import { mailEnabled } from "@/lib/mail";

export const metadata = { title: "Créer mon compte" };

/** Un invité (entré avec son prénom par le lien d'une famille) crée son compte, sans rien perdre. */
export default async function CreerMonCompte({ searchParams }: { searchParams: Promise<{ next?: string; pour?: string }> }) {
  const { next, pour } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/inscription");
  if (!user.guest) redirect(pour === "notifications" && !user.hasEmail ? "/profil#compte" : (safeNext(next) ?? "/profil"));
  const mail = mailEnabled();
  const target = safeNext(next) ?? "/familles";
  const pending = mail
    ? await db.emailCode.findFirst({
        where: { userId: user.id, purpose: "ACCOUNT", usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { email: true },
      })
    : null;
  const lead =
    pour === "notifications" && mail
      ? "Recevez vos notifications par e-mail : mentions, rappel avant l'événement, tirage du Secret Santa."
      : mail
        ? "Pour gérer votre profil, vous connecter depuis n'importe où et recevoir les notifications par e-mail."
        : "Pour gérer votre profil et vous connecter depuis n'importe où.";

  return (
    <AuthLayout
      aside={
        <>
          <h1 className="hero-title-sober" style={{ fontSize: "clamp(34px, 4.2vw, 56px)", maxWidth: 600 }}>
            {user.firstName}, gardez votre place
          </h1>
          <p className="hero-kicker auth-desktop-only" style={{ fontSize: 17, maxWidth: 520 }}>
            Vos souhaits, vos réservations et vos familles restent exactement comme ils sont.
          </p>
        </>
      }
    >
      <div>
        <h2>Créer mon compte</h2>
        <p className="lead">{lead}</p>
      </div>
      <div className="auth-card">
        <AccountUpgrade mail={mail} next={target} pendingEmail={pending?.email ?? null} />
      </div>
      <p className="m-0 text-center text-sm text-gris">
        <Link href={target}>Plus tard</Link>
      </p>
    </AuthLayout>
  );
}
