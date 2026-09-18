"use client";

import type { Role } from "@/lib/types";

export const AVATAR_OPTIONS = [
  { id: "teacher_m", emoji: "👨‍🏫", label: "Öğretmen (Erkek)" },
  { id: "teacher_w", emoji: "👩‍🏫", label: "Öğretmen (Kadın)" },
  { id: "student_m", emoji: "🧑‍🎓", label: "Öğrenci" },
  { id: "student_w", emoji: "👩‍🎓", label: "Öğrenci (Kız)" },
  { id: "grad", emoji: "🎓", label: "Mezuniyet" },
  { id: "rocket", emoji: "🚀", label: "Roket / Hedef" },
  { id: "brain", emoji: "🧠", label: "Zihin / Odak" },
  { id: "star", emoji: "⭐", label: "Yıldız" },
  { id: "trophy", emoji: "🏆", label: "Şampiyon" },
  { id: "bulb", emoji: "💡", label: "Fikir / İlham" },
  { id: "target", emoji: "🎯", label: "Hedef Tahtası" },
  { id: "books", emoji: "📚", label: "Kitapkurdu" },
  { id: "owl", emoji: "🦉", label: "Bilge Baykuş" },
  { id: "fire", emoji: "🔥", label: "Motivasyon" },
  { id: "lightning", emoji: "⚡", label: "Hızlı / Enerjik" },
  { id: "palette", emoji: "🎨", label: "Sanat" },
  { id: "microscope", emoji: "🔬", label: "Bilim / Deney" },
  { id: "lion", emoji: "🦁", label: "Lider / Güçlü" },
  { id: "fox", emoji: "🦊", label: "Pratik Zeka" },
  { id: "planet", emoji: "🪐", label: "Gezegen" },
];

interface UserAvatarProps {
  icon?: string | null;
  name?: string;
  role?: Role | "PARENT";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function UserAvatar({
  icon,
  role = "STUDENT",
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-base rounded-xl",
    md: "h-11 w-11 text-xl rounded-2xl",
    lg: "h-14 w-14 text-2xl rounded-2xl",
    xl: "h-16 w-16 text-3xl rounded-2xl",
  };

  const defaultIcon = role === "TEACHER" ? "👨‍🏫" : role === "PARENT" ? "👨‍👩‍👧" : "🧑‍🎓";
  const displayIcon = icon?.trim() || defaultIcon;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center bg-indigo-50/80 border border-indigo-100 shadow-xs select-none transition-transform dark:bg-indigo-950/40 dark:border-indigo-900/50 ${sizeClasses[size]} ${className}`}
    >
      <span className="leading-none">{displayIcon}</span>
    </div>
  );
}
