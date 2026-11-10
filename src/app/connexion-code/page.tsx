import { notFound, redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { mailEnabled } from "@/lib/mail";
import { AuthShell } from "@/components/festive";
import { CodeFlow } from "@/components/code-flow";

export const metadata = { title: "Connexion par code" };

export default async function ConnexionCode({ searchParams }: { searchParams: Promise<{ next?: string; email?: string }> }) {
  const { next, email } = await searchParams;
  const safe = safeNext(next) ?? undefined;
  if (await getCurrentUser()) redirect(safe ?? "/familles");
  if (!mailEnabled()) notFound();
  return (
    <AuthShell>
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-[26px] border border-sable bg-papier px-8 py-8" style={{ borderTop: "6px solid #B3202E" }}>
        <h1 className="font-display m-0 text-[32px] font-bold">Connexion par code</h1>
        <p className="m-0 leading-relaxed text-gris">Pas besoin de mot de passe : on vous envoie un code à 6 chiffres par e-mail.</p>
        <CodeFlow mode="LOGIN" next={safe} initialEmail={email ?? ""} />
      </div>
    </AuthShell>
  );
}
