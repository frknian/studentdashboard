"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Home,
  MessageCircleQuestion,
  Users,
} from "lucide-react";
import type { Role } from "@/lib/types";

const STUDENT_ITEMS = [
  { href: "/panel", label: "Panel", icon: Home },
  { href: "/panel/program", label: "Program", icon: CalendarCheck },
  { href: "/panel/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/panel/sorular", label: "Sorular", icon: MessageCircleQuestion },
  { href: "/panel/analiz", label: "Analiz", icon: BarChart3 },
];

const TEACHER_ITEMS = [
  { href: "/panel", label: "Panel", icon: Home },
  { href: "/panel/ogrenciler", label: "Öğrenciler", icon: Users },
  { href: "/panel/program", label: "Program", icon: CalendarCheck },
  { href: "/panel/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/panel/sorular", label: "Sorular", icon: MessageCircleQuestion },
  { href: "/panel/analiz", label: "Analiz", icon: BarChart3 },
];

export default function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = role === "TEACHER" ? TEACHER_ITEMS : STUDENT_ITEMS;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
