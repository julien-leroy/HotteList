// Règles de visibilité et de droits — le cœur de HotteList (cf. architecture §8).
// Module pur (aucun accès base) pour pouvoir être testé avec Vitest.
// Tout ce qui sort d'ici est ce que le navigateur reçoit : une donnée cachée
// n'est jamais envoyée, elle n'est pas « masquée en CSS ».

export type Viewer = { id: string; managedIds: string[] };

export type PersonLite = { id: string; firstName: string; lastName: string | null; avatarColor: string };

export type RawGift = {
  id: string;
  familyId: string;
  recipientId: string;
  createdById: string;
  kind: string; // SOUHAIT | IDEE
  title: string;
  description: string | null;
  url: string | null;
  price: string | null;
  imageUrl: string | null;
  siteOrigin: string | null;
  favorite: boolean;
  position: number;
  takeMode: string; // AUCUN | SEUL | A_PLUSIEURS
  contentUpdatedAt: Date;
  archivedAt: Date | null;
  createdAt: Date;
  createdBy: PersonLite;
  participants: { userId: string; createdAt: Date; status?: string; user: PersonLite }[];
  comments: { id: string; authorId: string; text: string; createdAt: Date; author: PersonLite }[];
};

export type Relation = "RECIPIENT" | "MANAGER" | "OTHER";

export type GiftSecret = {
  takeMode: "AUCUN" | "SEUL" | "A_PLUSIEURS";
  participants: PersonLite[];
  iParticipate: boolean;
  comments: { id: string; text: string; createdAt: string; author: PersonLite; mine: boolean }[];
  /** le souhait a été modifié après ma réservation / participation */
  changedSinceMine: boolean;
  /** mon statut d'achat (visible par moi seul) : A_ACHETER | ACHETE | EMBALLE */
  myStatus: PurchaseStatus | null;
};

export type PurchaseStatus = "A_ACHETER" | "ACHETE" | "EMBALLE";

export type VisibleGift = {
  id: string;
  familyId: string;
  recipientId: string;
  kind: "SOUHAIT" | "IDEE";
  title: string;
  description: string | null;
  url: string | null;
  price: string | null;
  imageUrl: string | null;
  siteOrigin: string | null;
  favorite: boolean;
  position: number;
  /** auteur d'une idée (jamais renseigné pour un souhait) */
  ideaBy: PersonLite | null;
  relation: Relation;
  createdAt: string;
  /** ajouté depuis ma dernière visite, par quelqu'un d'autre */
  isNew: boolean;
  /** réservations, participants, commentaires : null pour le destinataire */
  secret: GiftSecret | null;
  can: { edit: boolean; take: boolean; comment: boolean };
};

export function relationTo(viewer: Viewer, recipientId: string): Relation {
  if (viewer.id === recipientId) return "RECIPIENT";
  if (viewer.managedIds.includes(recipientId)) return "MANAGER";
  return "OTHER";
}

export function canEditGift(viewer: Viewer, g: Pick<RawGift, "kind" | "recipientId" | "createdById">) {
  if (g.kind === "SOUHAIT") {
    return g.recipientId === viewer.id || viewer.managedIds.includes(g.recipientId);
  }
  return g.createdById === viewer.id;
}

/** Réserver, participer, commenter : interdit sur un cadeau dont je suis le destinataire. */
export function canInteract(viewer: Viewer, g: Pick<RawGift, "recipientId">) {
  return g.recipientId !== viewer.id;
}

/** Peut-on proposer une idée pour cette personne ? Tout le monde sauf elle-même. */
export function canAddIdeaFor(viewer: Viewer, recipientId: string) {
  return recipientId !== viewer.id;
}

/** Peut-on écrire un souhait pour cette personne ? Soi-même ou un compte géré. */
export function canAddWishFor(viewer: Viewer, recipientId: string) {
  return recipientId === viewer.id || viewer.managedIds.includes(recipientId);
}

export function toVisibleGift(viewer: Viewer, g: RawGift, since?: Date | null): VisibleGift | null {
  if (g.archivedAt) return null;
  const relation = relationTo(viewer, g.recipientId);

  // Les IDÉES ajoutées pour moi n'existent pas pour moi.
  if (relation === "RECIPIENT" && g.kind !== "SOUHAIT") return null;

  const base = {
    id: g.id,
    familyId: g.familyId,
    recipientId: g.recipientId,
    kind: g.kind as "SOUHAIT" | "IDEE",
    title: g.title,
    description: g.description,
    url: g.url,
    price: g.price,
    imageUrl: g.imageUrl,
    siteOrigin: g.siteOrigin,
    favorite: g.favorite,
    position: g.position,
    ideaBy: g.kind === "IDEE" ? g.createdBy : null,
    relation,
    createdAt: g.createdAt.toISOString(),
    isNew: Boolean(since && g.createdAt > since && g.createdById !== viewer.id),
    can: {
      edit: canEditGift(viewer, g),
      take: relation !== "RECIPIENT" && canInteract(viewer, g),
      comment: relation !== "RECIPIENT",
    },
  };

  if (relation === "RECIPIENT") return { ...base, secret: null };

  const mine = g.participants.find((p) => p.userId === viewer.id);
  return {
    ...base,
    secret: {
      takeMode: g.takeMode as GiftSecret["takeMode"],
      participants: g.participants
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((p) => p.user),
      iParticipate: Boolean(mine),
      changedSinceMine: Boolean(mine && g.contentUpdatedAt > mine.createdAt),
      myStatus: mine ? ((mine.status as PurchaseStatus | undefined) ?? "A_ACHETER") : null,
      comments: g.comments
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((c) => ({
          id: c.id,
          text: c.text,
          createdAt: c.createdAt.toISOString(),
          author: c.author,
          mine: c.authorId === viewer.id,
        })),
    },
  };
}

export function giftsVisibleTo(viewer: Viewer, gifts: RawGift[], since?: Date | null): VisibleGift[] {
  const out: VisibleGift[] = [];
  for (const g of gifts) {
    const v = toVisibleGift(viewer, g, since);
    if (v) out.push(v);
  }
  // Souhaits dans l'ordre choisi, puis idées.
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "SOUHAIT" ? -1 : 1;
    return a.position - b.position;
  });
}
