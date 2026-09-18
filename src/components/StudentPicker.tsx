"use client";

import type { UserProfile } from "@/lib/types";

interface Props {
  students: UserProfile[];
  value: string;
  onChange: (studentId: string) => void;
  allowAll?: boolean;
  allLabel?: string;
}

export default function StudentPicker({
  students,
  value,
  onChange,
  allowAll,
  allLabel,
}: Props) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
        Henüz kayıtlı öğrenciniz yok. Öğrenciler sayfasındaki öğretmen kodunuzu
        paylaşarak öğrenci ekleyebilirsiniz.
      </div>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-400"
    >
      {allowAll ? (
        <option value="">{allLabel || "Tüm Öğrenciler"}</option>
      ) : (
        <option value="" disabled>
          Öğrenci seçin
        </option>
      )}
      {students.map((s) => (
        <option key={s.uid} value={s.uid}>
          {s.displayName}
        </option>
      ))}
    </select>
  );
}
