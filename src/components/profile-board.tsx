"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import type { PersonLite, VisibleGift } from "@/lib/visibility";
import { formatPrice } from "@/lib/format";
import { copyWish, moveWish, reorderWishes } from "@/app/actions/gifts";
import { GiftVisual, statusOf } from "./gift-ui";
import { GiftForm } from "./gift-form";
import { IconComment, IconDots, IconGrip, IconHidden, IconMove, IconPlus } from "./icons";
import { useAction } from "./toaster";

export type Column = { family: { id: string; name: string; slug: string }; gifts: VisibleGift[] };

type Props = { person: PersonLite; isSelf: boolean; columns: Column[] };

export function ProfileBoard({ person, isSelf, columns }: Props) {
  const [cols, setCols] = useState(columns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [copyMode, setCopyMode] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const alt = useRef(false);
  const { run } = useAction();

  useEffect(() => setCols(columns), [columns]);

  // Alt / Option maintenu pendant le glisser = copier au lieu de déplacer
  useEffect(() => {
    const on = (e: KeyboardEvent | PointerEvent) => {
      alt.current = e.altKey;
      setCopyMode(e.altKey);
    };
    window.addEventListener("keydown", on);
    window.addEventListener("keyup", on);
    window.addEventListener("pointermove", on);
    return () => {
      window.removeEventListener("keydown", on);
      window.removeEventListener("keyup", on);
      window.removeEventListener("pointermove", on);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const colOf = (id: string) => cols.find((c) => c.family.id === id || c.gifts.some((g) => g.id === id))?.family.id ?? null;
  const active = activeId ? cols.flatMap((c) => c.gifts).find((g) => g.id === activeId) ?? null : null;

  function onStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onOver(e: DragOverEvent) {
    setOverCol(e.over ? colOf(String(e.over.id)) : null);
  }
  function onEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverCol(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const from = colOf(id);
    const to = colOf(String(over.id));
    if (!from || !to) return;
    const src = cols.find((c) => c.family.id === from)!;
    const dst = cols.find((c) => c.family.id === to)!;

    if (from === to) {
      const oldI = src.gifts.findIndex((g) => g.id === id);
      const newI = over.id === to ? src.gifts.length - 1 : src.gifts.findIndex((g) => g.id === over.id);
      if (oldI === newI || newI < 0) return;
      const moved = arrayMove(src.gifts, oldI, newI);
      setCols((cs) => cs.map((c) => (c.family.id === from ? { ...c, gifts: moved } : c)));
      run(() => reorderWishes(from, person.id, moved.map((g) => g.id)));
      return;
    }

    const gift = src.gifts.find((g) => g.id === id)!;
    const overIndex = dst.gifts.findIndex((g) => g.id === over.id);
    const target = dst.gifts.slice();
    target.splice(overIndex < 0 ? target.length : overIndex, 0, gift);
    const ordered = target.map((g) => g.id);

    if (alt.current) {
      run(() => copyWish(id, to, ordered), `Copié dans ${dst.family.name}.`);
    } else {
      setCols((cs) =>
        cs.map((c) =>
          c.family.id === from ? { ...c, gifts: c.gifts.filter((g) => g.id !== id) } : c.family.id === to ? { ...c, gifts: target } : c,
        ),
      );
      run(() => moveWish(id, to, ordered), `Déplacé vers ${dst.family.name}.`);
    }
  }

  if (cols.length === 0) {
    return (
      <div className="panel flex flex-col gap-2 p-6">
        <h2 className="font-display m-0 text-2xl font-bold">Aucune famille pour l&apos;instant</h2>
        <p className="m-0 text-gris">
          {isSelf ? (
            <>Créez une famille ou rejoignez-en une depuis <Link href="/familles">Mes familles</Link>.</>
          ) : (
            <>Ajoutez {person.firstName} à une famille : cochez-la ci-dessus, dans « Modifier son profil ».</>
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      {isSelf && (
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-sapin">
          <IconHidden size={18} />
          Sur vos propres souhaits, réservations et commentaires restent cachés.
        </p>
      )}
      <p className="m-0 flex items-center gap-2 text-sm text-gris">
        <IconMove size={18} />
        Glissez une carte vers une autre famille pour l&apos;y déplacer (maintenez Alt / Option pour la copier), ou dans la même colonne pour changer l&apos;ordre.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragOver={onOver} onDragEnd={onEnd} onDragCancel={() => { setActiveId(null); setOverCol(null); }}>
        <div className="grid items-start gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))" }}>
          {cols.map((c) => (
            <FamilyColumn
              key={c.family.id}
              col={c}
              others={cols.filter((o) => o.family.id !== c.family.id).map((o) => o.family)}
              highlight={Boolean(activeId) && overCol === c.family.id && colOf(activeId!) !== c.family.id}
              copyMode={copyMode}
              person={person}
              isSelf={isSelf}
              adding={adding === c.family.id}
              setAdding={(v) => setAdding(v ? c.family.id : null)}
            />
          ))}
        </div>
        <DragOverlay>{active ? <ItemBody gift={active} isSelf={isSelf} overlay /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}

function FamilyColumn({
  col,
  others,
  highlight,
  copyMode,
  person,
  isSelf,
  adding,
  setAdding,
}: {
  col: Column;
  others: Column["family"][];
  highlight: boolean;
  copyMode: boolean;
  person: PersonLite;
  isSelf: boolean;
  adding: boolean;
  setAdding: (v: boolean) => void;
}) {
  const { setNodeRef } = useDroppable({ id: col.family.id });
  return (
    <section ref={setNodeRef} className={`col${highlight ? " over" : ""}`} aria-label={col.family.name}>
      <div className="flex flex-wrap items-baseline justify-between gap-2.5 px-1 pb-2" style={{ borderBottom: "2px dotted #D9A93E" }}>
        <h2 className="font-display m-0 text-[26px] font-bold italic">{col.family.name}</h2>
        <span className="text-[13px] text-gris">
          {col.gifts.length} souhait{col.gifts.length > 1 ? "s" : ""} · <Link href={`/f/${col.family.slug}`}>ouvrir</Link>
        </span>
      </div>
      {highlight && (
        <p className="m-0 text-center text-[13px] font-bold text-rouge">
          {copyMode ? "Relâchez pour copier ici" : "Relâchez pour déplacer ici"}
        </p>
      )}
      <SortableContext items={col.gifts.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        {col.gifts.map((g) => (
          <SortableItem key={g.id} gift={g} family={col.family} others={others} isSelf={isSelf} />
        ))}
      </SortableContext>
      {col.gifts.length === 0 && !adding && <p className="m-0 py-4 text-center text-sm text-gris-clair">Glissez un souhait ici, ou ajoutez-en un.</p>}
      {adding ? (
        <GiftForm
          mode="create"
          familyId={col.family.id}
          recipientId={person.id}
          kind="SOUHAIT"
          title={isSelf ? "Nouveau souhait" : `Nouveau souhait pour ${person.firstName}`}
          hint={`Dans ${col.family.name}.`}
          onDone={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-ivoire text-sm font-semibold text-[#8A1C26]"
          style={{ border: "2px dashed #D9A93E" }}
        >
          <IconPlus /> Ajouter un souhait
        </button>
      )}
    </section>
  );
}

function SortableItem({ gift, family, others, isSelf }: { gift: VisibleGift; family: Column["family"]; others: Column["family"][]; isSelf: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: gift.id });
  const { pending, run } = useAction();
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "item dragging" : undefined}>
      <ItemBody
        gift={gift}
        isSelf={isSelf}
        handle={
          <button ref={setActivatorNodeRef} className="handle" type="button" aria-label={`Déplacer « ${gift.title} »`} {...attributes} {...listeners}>
            <IconGrip />
          </button>
        }
        menu={
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button className="btn b-soft b-icon" type="button" aria-label={`Options pour « ${gift.title} »`} disabled={pending} style={{ minHeight: 40, width: 40 }}>
                <IconDots />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content className="menu" align="end" sideOffset={6}>
                <Dropdown.Item asChild className="menu-item">
                  <Link href={`/f/${family.slug}?cadeau=${gift.id}`} className="no-underline" style={{ color: "#1F3A2C" }}>
                    Ouvrir / modifier
                  </Link>
                </Dropdown.Item>
                {others.length > 0 && (
                  <>
                    <div className="menu-label">Déplacer vers</div>
                    {others.map((o) => (
                      <Dropdown.Item key={`m-${o.id}`} className="menu-item" onSelect={() => run(() => moveWish(gift.id, o.id), `Déplacé vers ${o.name}.`)}>
                        {o.name}
                      </Dropdown.Item>
                    ))}
                    <div className="menu-label">Copier vers</div>
                    {others.map((o) => (
                      <Dropdown.Item key={`c-${o.id}`} className="menu-item" onSelect={() => run(() => copyWish(gift.id, o.id), `Copié dans ${o.name}.`)}>
                        {o.name}
                      </Dropdown.Item>
                    ))}
                  </>
                )}
                {others.length === 0 && <div className="menu-label normal-case">Rejoignez une autre famille pour déplacer ou copier.</div>}
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        }
      />
    </div>
  );
}

function ItemBody({
  gift,
  isSelf,
  handle,
  menu,
  overlay,
}: {
  gift: VisibleGift;
  isSelf: boolean;
  handle?: React.ReactNode;
  menu?: React.ReactNode;
  overlay?: boolean;
}) {
  const st = statusOf(gift);
  const nb = gift.secret?.comments.length ?? 0;
  return (
    <div className={`item${overlay ? " overlay" : ""}`}>
      {handle ?? (
        <span className="handle">
          <IconGrip />
        </span>
      )}
      <GiftVisual gift={gift} iconSize={30} style={{ width: 52, height: 52, aspectRatio: "1", borderRadius: 12, flex: "none" }} />
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <span className="overflow-hidden text-[15px] leading-tight font-semibold text-ellipsis whitespace-nowrap">{gift.title}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="tag">{formatPrice(gift.price)}</span>
          {gift.favorite && <span className="text-xs font-bold text-rouge">Coup de cœur</span>}
          {!isSelf && st.kind === "OTHER" && <span className="pill" style={{ background: "#F6DCDD", color: "#7E1621", minHeight: 24 }}>Réservé · {st.by}</span>}
          {!isSelf && st.kind === "MINE" && <span className="pill" style={{ background: "#DCEDE2", color: "#14492F", minHeight: 24 }}>Réservé par vous</span>}
          {!isSelf && st.kind === "GROUP" && <span className="pill" style={{ background: "#F6E7C1", color: "#5C4214", minHeight: 24 }}>À plusieurs</span>}
          {!isSelf && nb > 0 && (
            <span className="cm">
              <IconComment size={11} />
              {nb}
            </span>
          )}
        </div>
      </div>
      {menu}
    </div>
  );
}

