"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "./toaster";
import { IconEdit } from "./icons";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Titre cliquable qui devient un champ : Entrée enregistre, Échap annule.
 * `value` vide est permis quand `allowEmpty` (ex. pseudo → retour au prénom).
 */
export function InlineEdit({
  value,
  display,
  label,
  placeholder,
  maxLength = 40,
  allowEmpty = false,
  success,
  onSave,
  className,
  style,
  inputStyle,
  as: Tag = "span",
}: {
  value: string;
  display?: ReactNode;
  label: string;
  placeholder?: string;
  maxLength?: number;
  allowEmpty?: boolean;
  success?: string;
  onSave: (v: string) => Promise<Result>;
  className?: string;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  as?: "span" | "h1" | "h2";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { pending, run } = useAction();

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  function save() {
    const v = draft.trim();
    if (v === value.trim() || (!v && !allowEmpty)) {
      setEditing(false);
      setDraft(value);
      return;
    }
    run(() => onSave(v), success, (r) => {
      if (r.ok) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (editing) {
    return (
      <Tag className={className} style={style}>
        <input
          ref={ref}
          aria-label={label}
          className="inline-edit"
          value={draft}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          style={{ width: `${Math.max(draft.length, placeholder?.length ?? 4, 4) + 2}ch`, ...inputStyle }}
        />
      </Tag>
    );
  }

  return (
    <Tag className={className} style={style}>
      <button
        type="button"
        className="inline-edit-trigger"
        title={label}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {display ?? value}
        <span className="inline-edit-pen" aria-hidden>
          <IconEdit size={16} />
        </span>
        <span className="sr-only"> ({label.charAt(0).toLowerCase() + label.slice(1)})</span>
      </button>
    </Tag>
  );
}
