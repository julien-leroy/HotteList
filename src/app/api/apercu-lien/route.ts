import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchLinkPreview } from "@/lib/link-preview";
import { hit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!hit(`preview:${user.id}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Trop de demandes, patientez un peu." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\//i.test(url) || url.length > 2000) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  }
  return NextResponse.json(await fetchLinkPreview(url));
}
