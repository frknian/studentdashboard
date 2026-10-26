"use client";

import { X } from "lucide-react";
import { KVKK_TEXT } from "@/lib/kvkk";

export default function KvkkModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg animate-sheet-up flex-col overflow-hidden rounded-t-[28px] bg-white pb-[env(safe-area-inset-bottom)] sm:animate-fade-up sm:rounded-[28px] sm:pb-0 dark:bg-[#1a1726]"
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
            className="w-full rounded-2xl bg-indigo-600 py-2.5 text-sm font-semibold text-white"
          >
            Okudum, Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
