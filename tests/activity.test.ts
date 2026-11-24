import { describe, expect, it } from "vitest";
import { activityLine, short } from "@/lib/activity";

describe("journal d'activité", () => {
  it("date et heure de Paris, puis le type et le texte", () => {
    expect(activityLine("souhait", "« Casque » pour Maman · Famille Leroy", new Date("2026-11-24T15:15:30Z"))).toBe(
      "[24/11/2026 16:15] souhait  « Casque » pour Maman · Famille Leroy",
    );
  });
  it("heure d'été", () => {
    expect(activityLine("famille", "x", new Date("2026-07-01T08:05:00Z"))).toBe("[01/07/2026 10:05] famille  x");
  });
  it("titres longs raccourcis", () => {
    expect(short("a".repeat(80), 10)).toBe("aaaaaaaaa…");
    expect(short("  Pull   rouge ")).toBe("Pull rouge");
  });
});
