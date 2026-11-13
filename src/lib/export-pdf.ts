import "server-only";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { ExportData, ExportGift } from "./export-list";

// Couleurs de la DA
const C = {
  bordeaux: "#7E1621",
  rouge: "#CF2B35",
  rougeTexte: "#8A1C26",
  sapin: "#1F4D36",
  encre: "#1F3A2C",
  gris: "#6B6658",
  or: "#D9A93E",
  orClair: "#FFCB2E",
  orPale: "#F6E7C1",
  creme: "#FFF9EE",
  sable: "#E3D6BA",
  lien: "#1F5E9E",
};

const FONTS = path.join(process.cwd(), "src/assets/fonts");
const M = 48; // marge

/** PDF A4 : en-tête bordeaux, puis la liste de chaque personne (titre, infos, lien cliquable). */
export async function buildPdf(d: ExportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: M, bottom: 60, left: M, right: M },
    bufferPages: true,
    info: { Title: `HotteList · ${d.familyName}`, Author: "HotteList" },
  });
  doc.registerFont("body", path.join(FONTS, "Inter-Regular.ttf"));
  doc.registerFont("bold", path.join(FONTS, "Inter-Bold.ttf"));
  doc.registerFont("title", path.join(FONTS, "Merienda-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((ok) => doc.on("end", () => ok(Buffer.concat(chunks))));

  const W = doc.page.width;
  const inner = W - 2 * M;
  const bottom = () => doc.page.height - 60;
  const ensure = (h: number) => {
    if (doc.y + h > bottom()) doc.addPage();
  };

  // En-tête
  doc.rect(0, 0, W, 112).fill(C.bordeaux);
  doc.rect(0, 112, W, 4).fill(C.or);
  doc.font("bold").fontSize(10).fillColor(C.orClair).text("HOTTELIST · LISTES DE SOUHAITS", M, 30, { characterSpacing: 1.2 });
  doc.font("title").fontSize(26).fillColor(C.creme).text(d.familyName, M, 44, { width: inner, lineBreak: false, ellipsis: true });
  doc.font("body").fontSize(10.5).fillColor("#F6DCDD").text(`${d.event} · exporté le ${d.exportedOn}`, M, 84);
  doc.y = 140;

  const meta = (g: ExportGift) =>
    [g.kind === "Idée" ? (g.ideaBy ? `Idée de ${g.ideaBy}` : "Idée") : "Souhait", g.favorite ? "Coup de cœur" : null, g.status || null, g.comments ? `${g.comments} commentaire${g.comments > 1 ? "s" : ""}` : null]
      .filter(Boolean)
      .join("  ·  ");

  d.people.forEach((p, i) => {
    // Titre de la personne (on ne le laisse pas seul en bas de page)
    ensure(90);
    if (i > 0) doc.moveDown(0.8);
    const wishes = p.gifts.filter((g) => g.kind === "Souhait").length;
    const ideas = p.gifts.length - wishes;
    doc.font("title").fontSize(19).fillColor(C.rouge).text(p.isMe ? `${p.name} (vous)` : p.name, M, doc.y, { width: inner });
    doc
      .font("body")
      .fontSize(9.5)
      .fillColor(C.gris)
      .text([p.realName !== p.name ? p.realName : null, `${wishes} souhait${wishes > 1 ? "s" : ""}`, ideas ? `${ideas} idée${ideas > 1 ? "s" : ""}` : null, p.note].filter(Boolean).join(" · "), { width: inner });
    const ly = doc.y + 6;
    doc.save().moveTo(M, ly).lineTo(W - M, ly).dash(1.5, { space: 3 }).lineWidth(1.2).strokeColor(C.or).stroke().restore();
    doc.y = ly + 10;

    if (!p.gifts.length) {
      doc.font("body").fontSize(10).fillColor(C.gris).text("Aucun souhait pour l'instant.", M, doc.y);
      return;
    }

    for (const g of p.gifts) {
      const priceW = g.price ? Math.min(90, doc.font("bold").fontSize(9.5).widthOfString(g.price) + 16) : 0;
      const textW = inner - 18 - (priceW ? priceW + 10 : 0);
      doc.font("bold").fontSize(11);
      const hTitle = doc.heightOfString(g.title, { width: textW });
      doc.font("body").fontSize(8.8);
      const m = meta(g);
      const hMeta = doc.heightOfString(m, { width: textW });
      const desc = g.description ? (g.description.length > 400 ? g.description.slice(0, 397) + "…" : g.description) : null;
      const hDesc = desc ? doc.heightOfString(desc, { width: textW }) + 3 : 0;
      const hLink = g.url ? 13 : 0;
      const h = hTitle + hMeta + hDesc + hLink + 16;
      ensure(h);

      const y0 = doc.y;
      // pastille
      doc.circle(M + 5, y0 + 7, 3.2).fill(g.kind === "Idée" ? C.sapin : g.favorite ? C.rouge : C.or);
      // prix
      if (g.price) {
        doc.roundedRect(W - M - priceW, y0 - 1, priceW, 17, 8.5).fill(C.orPale);
        doc.font("bold").fontSize(9.5).fillColor(C.encre).text(g.price, W - M - priceW, y0 + 3, { width: priceW, align: "center", lineBreak: false });
      }
      const x = M + 18;
      doc.font("bold").fontSize(11).fillColor(C.encre).text(g.title, x, y0, { width: textW });
      doc.font("body").fontSize(8.8).fillColor(g.status === "Disponible" ? C.sapin : C.gris).text(m, x, doc.y + 1, { width: textW });
      if (desc) doc.font("body").fontSize(8.8).fillColor(C.encre).text(desc, x, doc.y + 3, { width: textW });
      if (g.url) {
        const label = g.site ? `Voir sur ${g.site}` : g.url;
        doc.font("body").fontSize(8.8).fillColor(C.lien).text(label, x, doc.y + 2, { width: textW, link: g.url, underline: false, lineBreak: false, ellipsis: true });
      }
      const yEnd = doc.y + 7;
      doc.save().moveTo(x, yEnd).lineTo(W - M, yEnd).lineWidth(0.5).strokeColor(C.sable).stroke().restore();
      doc.y = yEnd + 8;
    }
  });

  // Pied de page sur chaque page
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const y = doc.page.height - 38;
    doc.page.margins.bottom = 0;
    doc.font("body").fontSize(8).fillColor(C.gris);
    doc.text(`HotteList · ${d.familyName}`, M, y, { lineBreak: false });
    doc.text(`${i + 1} / ${range.count}`, M, y, { width: inner, align: "right", lineBreak: false });
  }

  doc.end();
  return done;
}
