import { describe, expect, it } from "vitest";
import { guessIllustration, illustrationOf, illustrationUrl, isIllustrationUrl, ILLUSTRATIONS } from "@/lib/gift-illustrations";

describe("illustrations des cadeaux", () => {
  it.each([
    ["Manette PS5 DualSense blanche", "jeu-video"],
    ["Casque vélo enfant", "velo"],
    ["Casque Sony WH-1000XM5", "musique"],
    ["Montre connectée Garmin", "high-tech"],
    ["Montre en or", "bijou"],
    ["Lego Technic Ford GT", "jouet"],
    ["Pull Zara laine", "mode"],
    ["Orchidée blanche", "plante"],
    ["Voiture télécommandée", "voiture"],
    ["Tente 2 places", "plein-air"],
    ["Coffret de thés", null],
    ["", null],
  ])("« %s » → %s", (title, key) => expect(guessIllustration(title)).toBe(key));

  it("se rabat sur le site", () => {
    expect(guessIllustration("Truc 300", "decathlon.fr")).toBe("sport");
  });

  it("reconnaît les adresses « illu: »", () => {
    expect(illustrationOf(illustrationUrl("plante"))?.label).toBe("Plante, jardin");
    expect(isIllustrationUrl("illu:inconnue")).toBe(false);
    expect(illustrationOf("https://cdn.x/a.jpg")).toBeNull();
  });

  it("a des clés uniques", () => {
    expect(new Set(ILLUSTRATIONS.map((i) => i.key)).size).toBe(ILLUSTRATIONS.length);
  });
});
