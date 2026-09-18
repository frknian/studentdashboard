"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Copy,
  FileText,
  LogOut,
  Moon,
  Smartphone,
  Sun,
  MonitorSmartphone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type ThemeChoice } from "@/contexts/ThemeContext";
import { Card, SectionTitle, Badge } from "@/components/ui";
import KvkkModal from "@/components/KvkkModal";
import { TARGET_GROUP_LABELS } from "@/lib/types";
import { getGradeLabel } from "@/lib/curriculum";

const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: MonitorSmartphone },
];

export default function SettingsPage() {
  const { profile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showKvkk, setShowKvkk] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(profile!.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* yoksay */
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Ayarlar</h1>

      <SectionTitle title="Görünüm" />
      <Card>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-[#1e2a40]">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                theme === value
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-[#0f1a2c]"
                  : "text-slate-500"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </Card>

      <SectionTitle title="Hesap" />
      <Card className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Ad Soyad</span>
          <span className="font-semibold">{profile.displayName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">E-posta</span>
          <span className="font-medium">{profile.email}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Rol</span>
          <Badge tone="indigo">
            {profile.role === "TEACHER" ? "Öğretmen" : "Öğrenci"}
          </Badge>
        </div>
        {profile.targetGroup && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Hedef Grup</span>
            <span className="font-medium">{TARGET_GROUP_LABELS[profile.targetGroup]}</span>
          </div>
        )}
        {profile.grade && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Sınıf Seviyesi</span>
            <span className="font-medium text-indigo-600">{getGradeLabel(profile.grade)}</span>
          </div>
        )}
        {profile.schoolName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Okul</span>
            <span className="font-medium">{profile.schoolName}</span>
          </div>
        )}
        {profile.enrolledSubjects && profile.enrolledSubjects.length > 0 && (
          <div className="border-t border-slate-100 pt-2 text-sm dark:border-slate-800">
            <span className="text-xs text-slate-500">Takip Edilen Özel Dersler:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {profile.enrolledSubjects.map((s) => (
                <span
                  key={s}
                  className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {profile.role === "TEACHER" && (
        <>
          <SectionTitle title="Öğretmen Kodu" />
          <Card>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-[#0f1a2c]">
                {profile.uid}
              </code>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                Kopyala
              </button>
            </div>
          </Card>
        </>
      )}

      <SectionTitle title="Uygulama" />
      <Card className="space-y-1">
        <Link
          href="/panel/rehber"
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium transition hover:bg-slate-50 dark:hover:bg-[#1e2a40]"
        >
          <BookOpen size={18} className="text-indigo-500" />
          Kullanım Kılavuzu
        </Link>
        <button
          onClick={() => setShowKvkk(true)}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-medium transition hover:bg-slate-50 dark:hover:bg-[#1e2a40]"
        >
          <FileText size={18} className="text-indigo-500" />
          KVKK Aydınlatma Metni
        </button>
        <div className="flex items-center gap-3 px-2 py-2.5 text-sm text-slate-500">
          <Smartphone size={18} className="text-indigo-500" />
          Ana ekrana eklemek için tarayıcı menüsünden &quot;Ana Ekrana Ekle&quot;yi seçin.
        </div>
      </Card>

      <SectionTitle title="Oturum" />
      <button
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3 text-sm font-semibold text-rose-600 dark:bg-[#151f31] dark:border-rose-900"
      >
        <LogOut size={17} /> Çıkış Yap
      </button>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Öğrenci Takip v1.0.0 • KVKK v1.0
      </p>

      {showKvkk && <KvkkModal onClose={() => setShowKvkk(false)} />}
    </div>
  );
}
