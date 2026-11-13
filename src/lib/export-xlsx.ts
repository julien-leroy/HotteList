import "server-only";
import ExcelJS from "exceljs";
import type { ExportData } from "./export-list";

// Couleurs de la DA (ARGB)
const BORDEAUX = "FF7E1621";
const SAPIN = "FF1F4D36";
const OR_PALE = "FFF6E7C1";
const CREME = "FFFFF9EE";
const ROUGE_TEXTE = "FF8A1C26";
const GRIS = "FF6B6658";

/** Classeur Excel : une feuille « Toutes les listes » (une partie par personne), puis une feuille par personne. */
export async function buildXlsx(d: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HotteList";
  wb.created = new Date();

  const columns = [
    { header: "Type", key: "kind", width: 16 },
    { header: "Cadeau", key: "title", width: 42 },
    { header: "Prix", key: "price", width: 12 },
    { header: "Coup de cœur", key: "favorite", width: 13 },
    { header: "Statut", key: "status", width: 30 },
    { header: "Site", key: "site", width: 22 },
    { header: "Lien", key: "url", width: 40 },
    { header: "Description", key: "description", width: 50 },
    { header: "Commentaires", key: "comments", width: 14 },
  ];

  const used = new Set<string>();
  const sheetName = (name: string) => {
    const base = name.replace(/[\\/?*[\]:]/g, " ").slice(0, 28);
    let n = base;
    for (let k = 2; used.has(n.toLowerCase()); k++) n = `${base} ${k}`;
    used.add(n.toLowerCase());
    return n;
  };

  const sheet = (name: string, people: ExportData["people"]) => {
    const ws = wb.addWorksheet(sheetName(name), {
      views: [{ state: "frozen", ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
    });
    ws.columns = columns.map((c) => ({ key: c.key, width: c.width }));

    // Titre
    ws.mergeCells(1, 1, 1, columns.length);
    const t = ws.getCell(1, 1);
    t.value = `HotteList · ${d.familyName}`;
    t.font = { name: "Calibri", size: 18, bold: true, color: { argb: CREME } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BORDEAUX } };
    t.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(1).height = 34;
    ws.mergeCells(2, 1, 2, columns.length);
    const st = ws.getCell(2, 1);
    st.value = `${d.event} · exporté le ${d.exportedOn}`;
    st.font = { name: "Calibri", size: 11, italic: true, color: { argb: GRIS } };
    st.alignment = { indent: 1 };

    // En-têtes de colonnes
    const head = ws.getRow(4);
    columns.forEach((c, i) => {
      const cell = head.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: CREME } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SAPIN } };
      cell.alignment = { vertical: "middle" };
    });
    head.height = 22;

    for (const p of people) {
      // Bandeau de la personne
      const r = ws.addRow([]);
      ws.mergeCells(r.number, 1, r.number, columns.length);
      const c = r.getCell(1);
      const wishes = p.gifts.filter((g) => g.kind === "Souhait").length;
      const ideas = p.gifts.length - wishes;
      c.value = {
        richText: [
          { text: p.isMe ? `${p.name} (vous)` : p.name, font: { bold: true, size: 14, color: { argb: ROUGE_TEXTE } } },
          { text: `   ${wishes} souhait${wishes > 1 ? "s" : ""}${ideas ? ` · ${ideas} idée${ideas > 1 ? "s" : ""}` : ""}${p.note ? ` · ${p.note}` : ""}`, font: { size: 11, color: { argb: GRIS } } },
        ],
      };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OR_PALE } };
      c.alignment = { vertical: "middle", indent: 1 };
      r.height = 26;

      if (!p.gifts.length) {
        const e = ws.addRow({ title: "Aucun souhait pour l'instant" });
        e.getCell("title").font = { italic: true, color: { argb: GRIS } };
      }
      for (const g of p.gifts) {
        const row = ws.addRow({
          kind: g.kind === "Idée" && g.ideaBy ? `Idée de ${g.ideaBy}` : g.kind,
          title: g.title,
          price: g.price ?? "",
          favorite: g.favorite ? "Oui" : "",
          status: g.status,
          site: g.site ?? "",
          url: g.url ? { text: g.url, hyperlink: g.url } : "",
          description: g.description ?? "",
          comments: g.comments || "",
        });
        row.alignment = { vertical: "top", wrapText: true };
        row.getCell("title").font = { bold: true };
        if (g.url) row.getCell("url").font = { color: { argb: "FF1F5E9E" }, underline: true };
        if (g.favorite) row.getCell("favorite").font = { color: { argb: ROUGE_TEXTE }, bold: true };
        const s = row.getCell("status");
        if (g.status === "Disponible") s.font = { color: { argb: SAPIN }, bold: true };
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { bottom: { style: "hair", color: { argb: "FFE3D6BA" } } };
        });
      }
      ws.addRow([]);
    }
    return ws;
  };

  sheet("Toutes les listes", d.people);
  for (const p of d.people) sheet(p.isMe ? `${p.name} (vous)` : p.name, [p]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
