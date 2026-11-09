import { db } from "@/lib/db";
import { tokenDigest } from "@/lib/auth";
import { AuthShell } from "@/components/festive";
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
    <AuthShell>
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-[26px] border border-sable bg-papier px-8 py-8" style={{ borderTop: "6px solid #B3202E" }}>
        {valid ? (
          <>
            <h1 className="font-display m-0 text-[32px] font-bold">Bonjour {record.user.firstName} !</h1>
            <p className="m-0 text-gris">Choisissez votre nouveau mot de passe.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <>
            <h1 className="font-display m-0 text-[28px] font-bold">Lien expiré</h1>
            <p className="m-0 leading-relaxed text-gris">
              Ce lien a déjà servi ou a dépassé 24 h. Demandez-en un nouveau à l&apos;admin de votre famille.
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
