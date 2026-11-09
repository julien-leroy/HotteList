import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { AuthShell, CardHero } from "@/components/festive";
import { SignupForm } from "@/components/auth-forms";

export const metadata = { title: "Créer un compte" };

export default async function Inscription({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = safeNext(next) ?? undefined;
  if (await getCurrentUser()) redirect(safe ?? "/familles");
  return (
    <AuthShell>
      <div className="w-full max-w-[540px] overflow-hidden rounded-[26px] border border-sable bg-papier" style={{ boxShadow: "0 30px 60px -36px rgba(90,20,25,.55)" }}>
        <CardHero>
          <h1 className="font-display m-0 font-bold italic" style={{ fontSize: "clamp(38px,8vw,50px)", lineHeight: 1, letterSpacing: "-0.02em", textShadow: "0 3px 0 #5A1018" }}>
            Bienvenue !
          </h1>
          <p className="m-0 text-[15px] text-[#F6D9D2]">Créez votre compte, puis votre famille ou rejoignez-en une.</p>
        </CardHero>
        <div className="px-8 pt-7 pb-8">
          <SignupForm next={safe} loginHref={safe ? `/?next=${encodeURIComponent(safe)}` : "/"} />
        </div>
      </div>
    </AuthShell>
  );
}
