import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadVisibleGifts, personSelect } from "@/lib/queries";
import { eventDay } from "@/lib/format";
import { exportFileName, exportGift, type ExportData } from "@/lib/export-list";
import { buildPdf } from "@/lib/export-pdf";
import { buildXlsx } from "@/lib/export-xlsx";

/**
 * Téléchargement de toutes les listes de la famille : /f/[slug]/export?format=pdf|xlsx
 * Réservé aux membres. Contenu = exactement ce que la personne voit sur le site.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
  const user = await getCurrentUser();
  if (!user) return new Response("Connectez-vous pour télécharger les listes.", { status: 401 });
  const family = await db.family.findUnique({
    where: { slug },
    include: { memberships: { include: { user: { select: { ...personSelect, managedById: true } } }, orderBy: { joinedAt: "asc" } } },
  });
  if (!family || !family.memberships.some((m) => m.userId === user.id)) return new Response("Famille introuvable.", { status: 404 });

  const gifts = await loadVisibleGifts(user, family.id);
  const nick = new Map(family.memberships.filter((m) => m.nickname).map((m) => [m.userId, m.nickname!]));
  const shown = (u: { id: string; firstName: string }) => nick.get(u.id) ?? u.firstName;
  // Même ordre que la page : moi, mes comptes gérés, puis les autres
  const rank = (id: string) => (id === user.id ? 0 : user.managedIds.includes(id) ? 1 : 2);
  const members = family.memberships.slice().sort((a, b) => rank(a.userId) - rank(b.userId));

  const data: ExportData = {
    familyName: family.name,
    event: `${family.eventName} · ${eventDay(family.eventDate)}`,
    exportedOn: new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }),
    people: members.map((m) => {
      const isMe = m.userId === user.id;
      const mgr = m.user.managedById ? family.memberships.find((x) => x.userId === m.user.managedById)?.user : null;
      return {
        name: shown(m.user),
        realName: [m.user.firstName, m.user.lastName].filter(Boolean).join(" "),
        isMe,
        note: isMe ? "les réservations restent secrètes" : mgr ? `compte géré par ${user.managedIds.includes(m.userId) ? "vous" : shown(mgr)}` : null,
        gifts: gifts
          .filter((g) => g.recipientId === m.userId)
          .sort((a, b) => (a.kind === b.kind ? a.position - b.position : a.kind === "SOUHAIT" ? -1 : 1))
          .map(exportGift),
      };
    }),
  };

  const body = format === "xlsx" ? await buildXlsx(data) : await buildPdf(data);
  const name = exportFileName(family.name, format);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
