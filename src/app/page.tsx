import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { AuthShell, CardHero } from "@/components/festive";
import { LoginForm } from "@/components/auth-forms";

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = safeNext(next) ?? undefined;
  if (await getCurrentUser()) redirect(safe ?? "/familles");

  return (
    <AuthShell>
      <div className="w-full max-w-[540px] overflow-hidden rounded-[26px] border border-sable bg-papier" style={{ boxShadow: "0 30px 60px -36px rgba(90,20,25,.55)" }}>
        <CardHero>
          <p className="m-0 text-[15px] text-[#F6D9D2]">Les listes de Noël de toute la famille</p>
          <h1 className="font-display m-0 font-bold italic" style={{ fontSize: "clamp(38px,8vw,50px)", lineHeight: 1, letterSpacing: "-0.02em", textShadow: "0 3px 0 #5A1018" }}>
            Bon retour !
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-or-clair px-3 py-[5px] text-[13px] font-bold text-bordeaux-fonce">
            Sans gâcher la surprise
          </span>
        </CardHero>
        <div className="flex flex-col gap-[18px] px-8 pt-7 pb-8">
          <p className="m-0 text-base leading-relaxed text-gris">
            Chacun écrit ses souhaits, les autres réservent en secret ou se mettent à plusieurs.
          </p>
          <LoginForm next={safe} signupHref={safe ? `/inscription?next=${encodeURIComponent(safe)}` : "/inscription"} />
        </div>
      </div>
    </AuthShell>
  );
}
