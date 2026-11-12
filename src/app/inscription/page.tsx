import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { AuthLayout, HowItWorks, WelcomeAside } from "@/components/festive";
import { SignupForm } from "@/components/auth-forms";
import { mailEnabled } from "@/lib/mail";

export const metadata = { title: "Créer un compte" };

export default async function Inscription({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  const safe = safeNext(next) ?? undefined;
  if (await getCurrentUser()) redirect(safe ?? "/familles");
  const loginHref = `/${safe || email ? `?${new URLSearchParams({ ...(safe ? { next: safe } : {}), ...(email ? { email } : {}) })}` : ""}`;
  return (
    <AuthLayout aside={<WelcomeAside />} footer={<HowItWorks onLight />}>
      <nav className="auth-switch" aria-label="Connexion ou inscription">
        <Link href={loginHref}>J&apos;ai déjà un compte</Link>
        <Link href="/inscription" aria-current="page">Je suis nouveau</Link>
      </nav>
      <div>
        <h2>Créer un compte</h2>
        <p className="lead">Ensuite, créez votre famille ou rejoignez-en une avec le lien qu&apos;on vous a envoyé.</p>
      </div>
      <div className="auth-card">
        <SignupForm next={safe} mail={mailEnabled()} initialEmail={email ?? ""} />
      </div>
    </AuthLayout>
  );
}
