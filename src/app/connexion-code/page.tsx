import { notFound, redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { mailEnabled } from "@/lib/mail";
import { AuthLayout, WelcomeAside } from "@/components/festive";
import { CodeFlow } from "@/components/code-flow";

export const metadata = { title: "Connexion par code" };

export default async function ConnexionCode({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  const safe = safeNext(next) ?? undefined;
  if (await getCurrentUser()) redirect(safe ?? "/familles");
  if (!mailEnabled()) notFound();
  return (
    <AuthLayout aside={<WelcomeAside />}>
      <div>
        <h2>Connexion par code</h2>
        <p className="lead">Pas besoin de mot de passe : on vous envoie un code à 6 chiffres par e-mail.</p>
      </div>
      <div className="auth-card">
        <CodeFlow mode="LOGIN" next={safe} initialEmail={email ?? ""} />
      </div>
    </AuthLayout>
  );
}
