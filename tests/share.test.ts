import { describe, expect, it } from "vitest";
import { readShare } from "@/lib/share";

describe("partage depuis une autre appli", () => {
  it("adresse au milieu du texte (appli Fnac)", () => {
    expect(
      readShare({ text: "Découvrez Casque Sony WH-1000XM5 Noir - Casque audio - Achat & prix | fnac sur Fnac https://www.fnac.com/a17220436/Sony-WH?Origin=SHARE" }),
    ).toEqual({ url: "https://www.fnac.com/a17220436/Sony-WH?Origin=SHARE", title: "Casque Sony WH-1000XM5 Noir" });
  });
  it("titre et adresse séparés (Chrome)", () => {
    expect(readShare({ title: "Pull H&M | Vinted", url: "https://www.vinted.fr/items/1-pull-hm" })).toEqual({
      url: "https://www.vinted.fr/items/1-pull-hm",
      title: "Pull H&M",
    });
  });
  it("adresse seule, ponctuation retirée", () => {
    expect(readShare({ text: "https://amzn.eu/d/abc123." })).toEqual({ url: "https://amzn.eu/d/abc123", title: "" });
  });
  it("texte sans adresse", () => {
    expect(readShare({ text: "Un bon livre de cuisine" })).toEqual({ url: "", title: "Un bon livre de cuisine" });
  });
});
