import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { AuthLayout, HowItWorks, WelcomeAside } from "@/components/festive";
import { LoginForm } from "@/components/auth-forms";
import { mailEnabled } from "@/lib/mail";

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  const safe = safeNext(next) ?? undefined;
  if (await getCurrentUser()) redirect(safe ?? "/familles");
  const signupHref = `/inscription${safe || email ? `?${new URLSearchParams({ ...(safe ? { next: safe } : {}), ...(email ? { email } : {}) })}` : ""}`;

  return (
    <AuthLayout aside={<WelcomeAside />} footer={<HowItWorks onLight />}>
      <nav className="auth-switch" aria-label="Connexion ou inscription">
        <Link href="/" aria-current="page">J&apos;ai déjà un compte</Link>
        <Link href={signupHref}>Je suis nouveau</Link>
      </nav>
      <div>
        <h2>Se connecter</h2>
        <p className="lead">Retrouvez les listes de votre famille.</p>
      </div>
      <div className="auth-card">
        <LoginForm mail={mailEnabled()} next={safe} initialLogin={email ?? ""} />
      </div>
    </AuthLayout>
  );
}
