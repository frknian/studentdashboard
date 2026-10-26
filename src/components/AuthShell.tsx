import Image from "next/image";
import type { ReactNode } from "react";

/** Giriş / kayıt ekranları için ortak kabuk: üstte marka alanı, altta kart. */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-indigo-700 via-indigo-600 to-fuchsia-600 sm:items-center sm:justify-center sm:p-6">
      <div className="relative flex flex-col items-center gap-3 overflow-hidden px-6 pb-10 pt-[calc(3rem+env(safe-area-inset-top))] text-center text-white sm:pb-8 sm:pt-0">
        <div className="pointer-events-none absolute -left-16 top-4 h-48 w-48 rounded-full bg-white/10 blur-2xl sm:hidden" />
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[26px] bg-slate-950 p-1.5 shadow-2xl ring-4 ring-white/15">
          <Image
            src="/logo.png"
            alt="Öğrenci Takip Logo"
            width={80}
            height={80}
            className="h-full w-full rounded-[20px] object-contain"
            priority
          />
        </div>
        <div className="relative">
          <h1 className="text-[28px] font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-white/75">{subtitle}</p>
        </div>
      </div>

      <div className="flex-1 animate-sheet-up rounded-t-[32px] bg-[var(--app-bg)] px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-7 shadow-float sm:w-full sm:max-w-md sm:flex-none sm:animate-fade-up sm:rounded-[32px] sm:pb-8">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
