"use client";

import { Users } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  students: UserProfile[];
  value: string;
  onChange: (studentId: string) => void;
  allowAll?: boolean;
  allLabel?: string;
}

/** Yatay kaydırılabilir öğrenci çipleri (mobilde tek dokunuşla seçim). */
export default function StudentPicker({
  students,
  value,
  onChange,
  allowAll,
  allLabel,
}: Props) {
  if (students.length === 0) {
    return (
      <div className="rounded-3xl bg-amber-50 p-4 text-sm text-amber-800 dark:text-amber-200">
        Henüz kayıtlı öğrenciniz yok. Öğrenciler sayfasındaki öğretmen kodunuzu
        paylaşarak öğrenci ekleyebilirsiniz.
      </div>
    );
  }

  const chip = (active: boolean) =>
    `flex shrink-0 snap-start items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold active:scale-95 ${
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
        : "bg-white text-slate-700 ring-1 ring-slate-200"
    }`;

  return (
    <div
      role="radiogroup"
      aria-label="Öğrenci seçin"
      className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1"
    >
      {allowAll && (
        <button type="button" role="radio" aria-checked={value === ""} onClick={() => onChange("")} className={chip(value === "")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-current">
            <Users size={16} />
          </span>
          {allLabel || "Tümü"}
        </button>
      )}
      {students.map((s) => {
        const active = value === s.uid;
        return (
          <button
            key={s.uid}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.uid)}
            className={chip(active)}
          >
            <UserAvatar icon={s.avatarIcon} role="STUDENT" size="sm" className="h-8! w-8! rounded-full! text-base!" />
            <span className="max-w-[9rem] truncate">{s.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
