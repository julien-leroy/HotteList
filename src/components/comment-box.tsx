"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { fold, segments, type Mentionable } from "@/lib/mentions";
import { Avatar, type AvatarPerson } from "./avatar";

export type MentionPerson = Mentionable & { person: AvatarPerson };

const QUERY = /(^|[\s(])@([\p{L}\p{N}'’-]*(?: [\p{L}\p{N}'’-]*)?)$/u;

/** Zone de commentaire : « @ » ouvre la liste des personnes à mentionner. */
export function CommentBox({
  value,
  onChange,
  people,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  people: MentionPerson[];
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<{ text: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  // Position du curseur à rétablir juste après l'insertion d'une mention (avant toute autre frappe)
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current != null && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [value]);

  const matches = useMemo(() => {
    if (!query) return [];
    const q = fold(query.text);
    return people.filter((p) => fold(p.label).startsWith(q) || fold(p.person.firstName).startsWith(q)).slice(0, 6);
  }, [query, people]);

  function detect(el: HTMLTextAreaElement) {
    const before = el.value.slice(0, el.selectionStart ?? el.value.length);
    const m = before.match(QUERY);
    if (m) {
      setQuery({ text: m[2], start: before.length - m[2].length - 1 });
      setActive(0);
    } else setQuery(null);
  }

  function pick(p: MentionPerson) {
    const el = ref.current!;
    const end = el.selectionStart ?? value.length;
    const next = value.slice(0, query!.start) + `@${p.label} ` + value.slice(end);
    caret.current = query!.start + p.label.length + 2;
    onChange(next);
    setQuery(null);
  }

  const open = Boolean(query) && matches.length > 0;

  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="label" htmlFor="cmt">Votre commentaire</label>
      <div className="relative">
      <textarea
        ref={ref}
        className="input"
        id="cmt"
        value={value}
        disabled={disabled}
        maxLength={1000}
        placeholder="Je peux mettre 20 €, qui commande ? Tapez @ pour mentionner quelqu'un."
        role="combobox"
        aria-expanded={open}
        aria-controls="mention-list"
        aria-autocomplete="list"
        aria-activedescendant={open ? `mention-${matches[active]?.id}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target);
        }}
        onClick={(e) => detect(e.currentTarget)}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) detect(e.currentTarget);
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setQuery(null);
          }
        }}
      />
      {open && (
        <ul id="mention-list" role="listbox" className="menu absolute bottom-full left-0 z-10 m-0 mb-1 list-none" style={{ minWidth: 240 }}>
          <li className="menu-label" aria-hidden="true">Mentionner (prévenu par e-mail)</li>
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`mention-${p.id}`}
              role="option"
              aria-selected={i === active}
              className="menu-item"
              data-highlighted={i === active ? "" : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <Avatar person={p.person} size={26} />
              <span className="font-semibold">{p.label}</span>
            </li>
          ))}
        </ul>
      )}
      </div>
      <span className="text-xs text-gris-clair">
        Astuce : tapez <strong>@</strong> et un prénom pour prévenir quelqu&apos;un par e-mail.
      </span>
    </div>
  );
}

/** Affiche un commentaire en mettant en valeur les mentions (et encore plus la mienne). */
export function CommentText({ text, meId }: { text: string; meId: string }) {
  return (
    <>
      {segments(text).map((s, i) =>
        "mention" in s ? (
          <span
            key={i}
            className="rounded-md px-1 font-bold"
            style={s.id === meId ? { background: "#FFCB2E", color: "#5A1018" } : { background: "#F6E7C1", color: "#8A1C26" }}
          >
            @{s.mention}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
