import { describe, expect, it } from "vitest";
import {
  canAddIdeaFor,
  canAddWishFor,
  canEditGift,
  giftsVisibleTo,
  toVisibleGift,
  type RawGift,
  type Viewer,
} from "@/lib/visibility";

const person = (id: string) => ({ id, firstName: id, lastName: null, avatarColor: "#000" });
const t0 = new Date("2026-11-01T10:00:00Z");
const t1 = new Date("2026-11-02T10:00:00Z");

function gift(over: Partial<RawGift> = {}): RawGift {
  return {
    id: "g1",
    familyId: "f1",
    recipientId: "julien",
    createdById: "julien",
    kind: "SOUHAIT",
    title: "Vélo",
    description: null,
    url: null,
    price: "200",
    imageUrl: null,
    siteOrigin: null,
    favorite: false,
    position: 0,
    takeMode: "SEUL",
    contentUpdatedAt: t0,
    archivedAt: null,
    createdAt: t0,
    createdBy: person(over.createdById ?? "julien"),
    participants: [{ userId: "claire", createdAt: t0, user: person("claire") }],
    comments: [{ id: "c1", authorId: "claire", text: "Je m'en occupe", createdAt: t0, author: person("claire") }],
    ...over,
  };
}

const julien: Viewer = { id: "julien", managedIds: ["hugo"] };
const claire: Viewer = { id: "claire", managedIds: [] };
const paul: Viewer = { id: "paul", managedIds: [] };

describe("destinataire", () => {
  it("voit son souhait sans réservation ni commentaire", () => {
    const v = toVisibleGift(julien, gift())!;
    expect(v.secret).toBeNull();
    expect(v.can.take).toBe(false);
    expect(v.can.comment).toBe(false);
    expect(v.can.edit).toBe(true);
    // Aucune trace des participants ou commentaires dans l'objet envoyé
    expect(JSON.stringify(v)).not.toContain("claire");
    expect(JSON.stringify(v)).not.toContain("occupe");
  });

  it("ne voit pas les idées ajoutées pour lui", () => {
    const idea = gift({ id: "g2", kind: "IDEE", createdById: "claire" });
    expect(toVisibleGift(julien, idea)).toBeNull();
    expect(giftsVisibleTo(julien, [gift(), idea]).map((g) => g.id)).toEqual(["g1"]);
  });
});

describe("autre membre", () => {
  it("voit tout et peut réserver, commenter", () => {
    const v = toVisibleGift(paul, gift())!;
    expect(v.secret?.takeMode).toBe("SEUL");
    expect(v.secret?.participants.map((p) => p.id)).toEqual(["claire"]);
    expect(v.secret?.comments).toHaveLength(1);
    expect(v.can.take).toBe(true);
    expect(v.can.edit).toBe(false);
  });

  it("voit les idées des autres, avec leur auteur", () => {
    const idea = gift({ kind: "IDEE", createdById: "claire" });
    const v = toVisibleGift(paul, idea)!;
    expect(v.ideaBy?.id).toBe("claire");
    expect(v.can.edit).toBe(false);
    expect(toVisibleGift(claire, idea)!.can.edit).toBe(true);
  });

  it("est prévenu si le souhait a changé depuis sa réservation", () => {
    expect(toVisibleGift(claire, gift())!.secret?.changedSinceMine).toBe(false);
    expect(toVisibleGift(claire, gift({ contentUpdatedAt: t1 }))!.secret?.changedSinceMine).toBe(true);
    expect(toVisibleGift(paul, gift({ contentUpdatedAt: t1 }))!.secret?.changedSinceMine).toBe(false);
  });
});

describe("gestionnaire d'un compte géré", () => {
  const forHugo = gift({ recipientId: "hugo", createdById: "julien" });
  const ideaForHugo = gift({ id: "g3", recipientId: "hugo", kind: "IDEE", createdById: "claire" });

  it("voit tout sur la liste de l'enfant, idées comprises", () => {
    expect(toVisibleGift(julien, forHugo)!.secret?.participants).toHaveLength(1);
    expect(toVisibleGift(julien, ideaForHugo)).not.toBeNull();
  });

  it("peut modifier ses souhaits mais pas les idées des autres", () => {
    expect(toVisibleGift(julien, forHugo)!.can.edit).toBe(true);
    expect(toVisibleGift(julien, ideaForHugo)!.can.edit).toBe(false);
    expect(canEditGift(paul, forHugo)).toBe(false);
  });

  it("peut écrire des souhaits pour l'enfant", () => {
    expect(canAddWishFor(julien, "hugo")).toBe(true);
    expect(canAddWishFor(claire, "hugo")).toBe(false);
    expect(canAddIdeaFor(julien, "julien")).toBe(false);
    expect(canAddIdeaFor(claire, "julien")).toBe(true);
  });
});

describe("archives", () => {
  it("les cadeaux archivés n'apparaissent plus", () => {
    expect(toVisibleGift(paul, gift({ archivedAt: t1 }))).toBeNull();
  });

  it("souhaits triés par position, puis idées", () => {
    const list = giftsVisibleTo(paul, [
      gift({ id: "i", kind: "IDEE", createdById: "claire", position: 0 }),
      gift({ id: "b", position: 2 }),
      gift({ id: "a", position: 1 }),
    ]);
    expect(list.map((g) => g.id)).toEqual(["a", "b", "i"]);
  });
});
