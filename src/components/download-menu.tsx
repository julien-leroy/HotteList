"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { IconDownload } from "./icons";

/** Bouton icône (fond bleuté) qui propose de télécharger toutes les listes en PDF ou en Excel. */
export function DownloadMenu({ familySlug, align = "center" }: { familySlug: string; align?: "start" | "center" | "end" }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button type="button" className="dl-icon" aria-label="Télécharger toutes les listes (PDF ou Excel)" title="Télécharger toutes les listes">
          <IconDownload size={22} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="menu" align={align} sideOffset={8}>
          <p className="m-0 px-3 pt-1.5 pb-2 text-xs font-semibold text-gris">Toutes les listes de la famille</p>
          <Dropdown.Item asChild className="menu-item no-underline">
            <a href={`/f/${familySlug}/export?format=pdf`} download style={{ color: "#1F3A2C" }}>
              <span className="dl-tag" style={{ background: "#F6DCDD", color: "#8A1C26" }}>PDF</span> À imprimer ou partager
            </a>
          </Dropdown.Item>
          <Dropdown.Item asChild className="menu-item no-underline">
            <a href={`/f/${familySlug}/export?format=xlsx`} download style={{ color: "#1F3A2C" }}>
              <span className="dl-tag" style={{ background: "#DDEBE1", color: "#1F4D36" }}>XLS</span> Tableau Excel
            </a>
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
