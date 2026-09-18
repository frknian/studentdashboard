"use client";

import { X } from "lucide-react";
import { KVKK_TEXT } from "@/lib/kvkk";

export default function KvkkModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white dark:bg-[#151f31] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="text-sm font-bold">KVKK Aydınlatma Metni</h2>
          <button onClick={onClose} className="p-1 text-slate-400" aria-label="Kapat">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {KVKK_TEXT}
          </p>
        </div>
        <div className="border-t border-slate-200 p-3 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white"
          >
            Okudum, Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
