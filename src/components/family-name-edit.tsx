"use client";

import { InlineEdit } from "./inline-edit";
import { renameFamily } from "@/app/actions/family";

/** Nom de la famille, modifiable d'un clic (admin). */
export function FamilyNameEdit({ familyId, name }: { familyId: string; name: string }) {
  return <InlineEdit value={name} label="Renommer la famille" maxLength={60} success="Nom modifié." onSave={(v) => renameFamily(familyId, v)} />;
}
