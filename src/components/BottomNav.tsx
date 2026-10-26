"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Home,
  LayoutGrid,
  LogOut,
  MessageCircleQuestion,
  Moon,
  Settings,
  Sun,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Sheet } from "@/components/ui";
import UserAvatar from "@/components/UserAvatar";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const STUDENT_PRIMARY: NavItem[] = [
  { href: "/panel", label: "Ana Sayfa", icon: Home },
  { href: "/panel/program", label: "Program", icon: CalendarCheck },
  { href: "/panel/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/panel/sorular", label: "Sorular", icon: MessageCircleQuestion },
];

const STUDENT_MORE: NavItem[] = [
  { href: "/panel/analiz", label: "Analiz", icon: BarChart3 },
  { href: "/panel/rehber", label: "Kılavuz", icon: BookOpen },
  { href: "/panel/ayarlar", label: "Ayarlar", icon: Settings },
];

const TEACHER_PRIMARY: NavItem[] = [
  { href: "/panel", label: "Ana Sayfa", icon: Home },
  { href: "/panel/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/panel/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/panel/program", label: "Program", icon: CalendarCheck },
];

const TEACHER_MORE: NavItem[] = [
  { href: "/panel/sorular", label: "Sorular", icon: MessageCircleQuestion },
  { href: "/panel/analiz", label: "Analiz", icon: BarChart3 },
  { href: "/panel/finans", label: "Finans", icon: Wallet },
  { href: "/panel/rehber", label: "Kılavuz", icon: BookOpen },
  { href: "/panel/ayarlar", label: "Ayarlar", icon: Settings },
];

export function navFor(role: Role) {
  return role === "TEACHER"
    ? { primary: TEACHER_PRIMARY, more: TEACHER_MORE }
    : { primary: STUDENT_PRIMARY, more: STUDENT_MORE };
}

export function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
}

/* ------------------------------ Mobil alt menü ------------------------------ */

export default function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { primary, more } = navFor(role);
  const moreActive = more.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch gap-1 rounded-[26px] border border-white/60 bg-white/85 p-1.5 shadow-float backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#1a1726]/85">
          {primary.map((item) => (
            <NavButton key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-semibold ${
              moreActive ? "bg-indigo-600 text-white" : "text-slate-500"
            }`}
            aria-label="Menü"
          >
            <LayoutGrid size={21} strokeWidth={moreActive ? 2.4 : 1.9} />
            Menü
          </button>
        </div>
      </nav>

      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} items={more} />
    </>
  );
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] py-2 text-[10.5px] font-semibold active:scale-95 ${
        active ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "text-slate-500"
      }`}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
      <span className="max-w-full truncate px-0.5">{item.label}</span>
    </Link>
  );
}

function MenuSheet({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
}) {
  const { profile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Sheet open={open} onClose={onClose}>
      {profile && (
        <Link
          href="/panel/ayarlar"
          onClick={onClose}
          className="mb-4 flex items-center gap-3 rounded-3xl bg-slate-50 p-3"
        >
          <UserAvatar icon={profile.avatarIcon} role={profile.role} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{profile.displayName}</p>
            <p className="text-xs text-slate-500">
              {profile.role === "TEACHER" ? "Öğretmen" : "Öğrenci"} • Profili düzenle
            </p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex aspect-[1.1] flex-col items-center justify-center gap-2 rounded-3xl text-xs font-semibold active:scale-95 ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-100"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  active ? "bg-white/15" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300"
                }`}
              >
                <Icon size={21} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-3.5 text-sm font-semibold text-slate-700"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
          {isDark ? "Açık Tema" : "Koyu Tema"}
        </button>
        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-rose-50 py-3.5 text-sm font-semibold text-rose-600"
        >
          <LogOut size={17} /> Çıkış Yap
        </button>
      </div>
    </Sheet>
  );
}

/* --------------------------- Masaüstü yan menü --------------------------- */

export function SideNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { primary, more } = navFor(role);

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/70 bg-white/70 px-4 py-5 backdrop-blur-xl lg:flex dark:bg-[#14111d]/70">
      <Link href="/panel" className="mb-7 flex items-center gap-2.5 px-2">
        <Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl bg-slate-950 object-contain p-0.5" />
        <span className="text-[17px] font-extrabold tracking-tight">Öğrenci Takip</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {[...primary, ...more].map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.3 : 1.9} />
              {label}
            </Link>
          );
        })}
      </nav>

      {profile && (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2.5">
          <UserAvatar icon={profile.avatarIcon} role={profile.role} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{profile.displayName}</p>
            <p className="text-[11px] text-slate-500">
              {profile.role === "TEACHER" ? "Öğretmen" : "Öğrenci"}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Çıkış Yap"
          >
            <LogOut size={17} />
          </button>
        </div>
      )}
    </aside>
  );
}
