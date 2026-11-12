import Link from "next/link";
import { db } from "@/lib/db";
import { tokenDigest } from "@/lib/auth";
import { AuthLayout, WelcomeAside } from "@/components/festive";
import { ResetForm } from "@/components/auth-forms";

export const metadata = { title: "Nouveau mot de passe" };

export default async function Reinitialiser({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.passwordResetToken.findUnique({
    where: { id: tokenDigest(token) },
    include: { user: { select: { firstName: true } } },
  });
  const valid = record && !record.usedAt && record.expiresAt > new Date();
  return (
    <AuthLayout aside={<WelcomeAside />}>
      {valid ? (
        <>
          <div>
            <h2>Bonjour {record.user.firstName}{"\u00a0!"}</h2>
            <p className="lead">Choisissez votre nouveau mot de passe.</p>
          </div>
          <div className="auth-card">
            <ResetForm token={token} />
          </div>
        </>
      ) : (
        <div>
          <h2>Ce lien ne marche plus</h2>
          <p className="lead">
            Il a déjà servi ou a dépassé 24 h. Demandez-en un nouveau à quelqu&apos;un de votre famille.
          </p>
          <p className="mt-4 mb-0"><Link href="/">Retour à la connexion</Link></p>
        </div>
      )}
    </AuthLayout>
  );
}
