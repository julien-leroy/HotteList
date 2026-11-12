import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { mailEnabled } from "@/lib/mail";
import { AuthLayout, WelcomeAside } from "@/components/festive";
import { CodeFlow } from "@/components/code-flow";

export const metadata = { title: "Mot de passe oublié" };

export default async function MotDePasseOublie({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (await getCurrentUser()) redirect("/profil");
  return (
    <AuthLayout aside={<WelcomeAside />}>
      <div>
        <h2>Mot de passe oublié ?</h2>
        <p className="lead">
          {mailEnabled()
            ? "Recevez un code par e-mail pour choisir un nouveau mot de passe."
            : "Demandez à quelqu’un de votre famille de vous créer un lien depuis « Membres »."}
        </p>
      </div>
      {mailEnabled() && (
        <div className="auth-card">
          <CodeFlow mode="RESET" initialEmail={email ?? ""} />
        </div>
      )}
      <p className="m-0 text-[14px] leading-normal text-gris">
        {mailEnabled() && <>Pas d&apos;adresse e-mail sur votre compte ? Demandez à quelqu&apos;un de votre famille de vous créer un lien depuis « Membres ». </>}
        <Link href="/">Retour à la connexion</Link>
      </p>
    </AuthLayout>
  );
}
