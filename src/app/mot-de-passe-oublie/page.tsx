import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { mailEnabled } from "@/lib/mail";
import { AuthShell } from "@/components/festive";
import { CodeFlow } from "@/components/code-flow";

export const metadata = { title: "Mot de passe oublié" };

export default async function MotDePasseOublie() {
  if (await getCurrentUser()) redirect("/profil");
  return (
    <AuthShell>
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-[26px] border border-sable bg-papier px-8 py-8" style={{ borderTop: "6px solid #B3202E" }}>
        <h1 className="font-display m-0 text-[32px] font-bold">Mot de passe oublié ?</h1>
        {mailEnabled() ? (
          <>
            <p className="m-0 leading-relaxed text-gris">Recevez un code par e-mail pour choisir un nouveau mot de passe.</p>
            <CodeFlow mode="RESET" />
          </>
        ) : null}
        <p className="m-0 border-t-2 border-dotted border-or pt-4 text-[13px] leading-normal text-gris-clair">
          Pas d&apos;adresse e-mail sur votre compte ? Demandez à quelqu&apos;un de votre famille de vous créer un lien depuis « Membres ».{" "}
          {!mailEnabled() && <Link href="/">Retour à la connexion</Link>}
        </p>
      </div>
    </AuthShell>
  );
}
