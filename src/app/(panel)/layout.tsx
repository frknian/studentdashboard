"use client";

import { useEffect, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav, { SideNav, navFor } from "@/components/BottomNav";
import NotificationCenter from "@/components/NotificationCenter";
import UserAvatar from "@/components/UserAvatar";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/giris");
  }, [loading, user, router]);

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Alt menüde doğrudan yer almayan sayfalarda geri butonu göster
  const isPrimary = navFor(profile.role).primary.some((i) => i.href === pathname);

  return (
    <div className="min-h-dvh lg:pl-64">
      <SideNav role={profile.role} />

      <header className="no-print sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        {/* Bulanık arka plan ayrı katmanda: header üzerinde backdrop-filter olursa
            içindeki fixed konumlu bildirim paneli header'a göre konumlanır. */}
        <div className="absolute inset-0 -z-10 bg-[var(--app-bg)]/80 backdrop-blur-xl" />
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          {isPrimary ? (
            <Link href="/panel" className="flex items-center gap-2 lg:invisible">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-[10px] bg-slate-950 object-contain p-0.5"
              />
              <span className="text-[15px] font-extrabold tracking-tight">Öğrenci Takip</span>
            </Link>
          ) : (
            <button
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/panel"))}
              className="-ml-2 flex items-center gap-0.5 rounded-xl py-1.5 pl-1 pr-3 text-sm font-semibold text-indigo-600 dark:text-indigo-300"
            >
              <ChevronLeft size={22} /> Geri
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <NotificationCenter />
            <Link href="/panel/ayarlar" aria-label="Ayarlar ve profil">
              <UserAvatar icon={profile.avatarIcon} role={profile.role} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main key={pathname} className="pb-nav mx-auto max-w-3xl animate-fade-up px-4 pt-2 lg:pb-12">
        {children}
      </main>

      <BottomNav role={profile.role} />
    </div>
  );
}
