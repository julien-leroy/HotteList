"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_AVATAR_BG, isAvatarBg, isAvatarId } from "@/lib/avatars";
import type { ActionResult } from "./family";

/**
 * Choisir l'avatar (personnage + fond) de son compte ou d'un compte que je gère.
 * `avatar` vide : retour aux initiales.
 */
export async function setAvatar(personId: string, avatar: string | null, bg: string | null): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const mine = personId === user.id;
    if (mine ? !user.verified : !user.managedIds.includes(personId)) {
      throw new Error(mine ? "Créez votre compte HotteList pour choisir un avatar." : "Vous ne gérez pas ce compte.");
    }
    if (avatar !== null && !isAvatarId(avatar)) throw new Error("Avatar inconnu.");
    if (bg !== null && !isAvatarBg(bg)) throw new Error("Fond inconnu.");
    await db.user.update({
      where: { id: personId },
      data: avatar ? { avatar, avatarBg: bg ?? DEFAULT_AVATAR_BG } : { avatar: null, avatarBg: null },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
  }
}
