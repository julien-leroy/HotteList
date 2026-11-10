import { describe, expect, it } from "vitest";
import { encodeMentions, mentionIds, mentionLabels, segments, toPlain } from "@/lib/mentions";

const people = [
  { id: "cmichou0000000001", label: "Papi Michou" },
  { id: "cclaire0000000002", label: "Claire" },
];

describe("mentions", () => {
  it("reconnaît @Claire, @papiMichou et @Papi Michou", () => {
    const t = encodeMentions("@Claire et @papiMichou, puis @Papi Michou !", people);
    expect(t).toBe("@[Claire](cclaire0000000002) et @[Papi Michou](cmichou0000000001), puis @[Papi Michou](cmichou0000000001) !");
    expect(mentionIds(t)).toEqual(["cclaire0000000002", "cmichou0000000001"]);
    expect(toPlain(t)).toBe("@Claire et @Papi Michou, puis @Papi Michou !");
  });

  it("ignore les inconnus, les adresses e-mail et les mots plus longs", () => {
    expect(encodeMentions("écris à claire@exemple.fr ou @Bob", people)).toBe("écris à claire@exemple.fr ou @Bob");
    expect(encodeMentions("@Clairette", people)).toBe("@Clairette");
    expect(encodeMentions("@claire, @CLAIRE", people)).toBe("@[Claire](cclaire0000000002), @[Claire](cclaire0000000002)");
  });

  it("une mention forgée vers quelqu'un hors liste reste du texte une fois revalidée", () => {
    // le serveur repasse par toPlain puis encodeMentions avec SA liste autorisée
    const forged = "@[Julien](cjulien0000000003) regarde";
    expect(encodeMentions(toPlain(forged), people)).toBe("@Julien regarde");
  });

  it("découpe pour l'affichage", () => {
    expect(segments("Merci @[Claire](cclaire0000000002) !")).toEqual([
      { text: "Merci " },
      { mention: "Claire", id: "cclaire0000000002" },
      { text: " !" },
    ]);
  });

  it("libellés uniques en cas d'homonymes", () => {
    expect(
      mentionLabels([
        { id: "a", firstName: "Marie", lastName: "Leroy" },
        { id: "b", firstName: "Marie", lastName: "Dupont" },
        { id: "c", firstName: "Paul", lastName: null },
      ]).map((p) => p.label),
    ).toEqual(["Marie L.", "Marie D.", "Paul"]);
  });
});
