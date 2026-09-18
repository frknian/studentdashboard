"use client";

import { useState, useEffect } from "react";
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
import UserAvatar, { AVATAR_OPTIONS } from "@/components/UserAvatar";
import { updateStudentSettings } from "@/lib/services/users";
import { refreshParentView } from "@/lib/services/parent";
import { TARGET_GROUP_LABELS } from "@/lib/types";
import { getGradeLabel } from "@/lib/curriculum";

const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: MonitorSmartphone },
];

export default function SettingsPage() {
  const { profile, logout, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showKvkk, setShowKvkk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);

  // PWA Ekrana Yükleme Durumları
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isRunningStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) {
      if (isIos) {
        setShowIosGuide((v) => !v);
      } else {
        alert("Uygulamayı tarayıcı menünüzdeki (üç nokta) 'Ana Ekrana Ekle' veya 'Uygulamayı Yükle' seçeneğiyle doğrudan cihazınıza kurabilirsiniz.");
      }
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsStandalone(true);
      setInstallPrompt(null);
    }
  }

  if (!profile) return null;

  async function handleSelectAvatar(emoji: string) {
    if (!profile) return;
    setBusyAvatar(true);
    try {
      await updateStudentSettings(profile.uid, { avatarIcon: emoji });
      await refreshProfile();
      if (profile.role === "STUDENT") {
        refreshParentView(profile.uid).catch(() => {});
      }
      setAvatarSaved(true);
      setTimeout(() => setAvatarSaved(false), 2000);
    } finally {
      setBusyAvatar(false);
    }
  }

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

      <SectionTitle title="Profil Simgesi (Avatar)" />
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <UserAvatar
            icon={profile.avatarIcon}
            role={profile.role}
            name={profile.displayName}
            size="lg"
          />
          <div>
            <p className="text-xs text-slate-500">Mevcut Simgeniz</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {profile.displayName}
            </p>
            <p className="text-[11px] text-slate-400">
              Bu simge ana panelde ve veli/öğretmen ekranında isminizin yanında gösterilir.
            </p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Önerilen Simgelerden Seçin:
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {AVATAR_OPTIONS.map((opt) => {
            const currentSelected =
              profile.avatarIcon?.trim() ||
              (profile.role === "TEACHER" ? "👨‍🏫" : "🧑‍🎓");
            const isSelected = currentSelected === opt.emoji;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectAvatar(opt.emoji)}
                disabled={busyAvatar}
                title={opt.label}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition-all duration-150 hover:scale-105 active:scale-95 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-[#151f31]"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-[#1e2a40] dark:hover:bg-[#283854]"
                }`}
              >
                <span>{opt.emoji}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-xs text-slate-500">Kendi Simgeni / Emojini Yaz:</span>
          <input
            type="text"
            maxLength={4}
            placeholder="Örn: 🦁"
            value={customEmoji}
            onChange={(e) => setCustomEmoji(e.target.value)}
            className="w-20 rounded-xl border border-slate-200 px-2.5 py-1 text-center text-lg outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#0f1a2c]"
          />
          <button
            type="button"
            onClick={() => {
              if (customEmoji.trim()) {
                handleSelectAvatar(customEmoji.trim());
                setCustomEmoji("");
              }
            }}
            disabled={!customEmoji.trim() || busyAvatar}
            className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
          >
            {busyAvatar ? "Kaydediliyor..." : "Uygula"}
          </button>
          {avatarSaved && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Simge güncellendi
            </span>
          )}
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

      <SectionTitle title="Ekrana Yükle & Uygulama" />
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-1 shadow-sm ring-1 ring-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="Logo"
              className="h-full w-full object-contain rounded-xl"
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Öğrenci Takip Uygulaması
            </h3>
            <p className="text-xs text-slate-500">
              {isStandalone
                ? "✓ Uygulama cihazınıza yüklendi ve aktif"
                : "Uygulamayı ana ekranınıza ekleyerek tam ekran ve hızlı kullanın."}
            </p>
          </div>
        </div>

        {isStandalone ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check size={16} />
            Uygulama başarıyla ana ekranınıza yüklendi.
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleInstallApp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
            >
              <Smartphone size={16} />
              {installPrompt
                ? "Uygulamayı Şimdi Ekrana Yükle"
                : isIos
                  ? (showIosGuide ? "iPhone Kurulum Adımlarını Gizle" : "iPhone / iPad Ana Ekrana Nasıl Eklenir?")
                  : "Uygulamayı Ekrana Yükle"}
            </button>

            {(showIosGuide || isIos) && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-slate-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-slate-300">
                <p className="font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
                  📱 iPhone / Safari Kurulum Adımları:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>Safari&apos;nin alt çubuğundaki <strong>Paylaş</strong> (kare içinde yukarı ok) simgesine dokunun.</li>
                  <li>Menüyü aşağı kaydırıp <strong>&quot;Ana Ekrana Ekle&quot;</strong> seçeneğine dokunun.</li>
                  <li>Sağ üstteki <strong>&quot;Ekle&quot;</strong> butonuna dokunun.</li>
                </ol>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Logo doğrudan ana ekranınızda bir mobil uygulama gibi belirecektir.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-slate-100 pt-2 space-y-1 dark:border-slate-800">
          <Link
            href="/panel/rehber"
            className="flex items-center gap-3 rounded-xl px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#1e2a40]"
          >
            <BookOpen size={16} className="text-indigo-500" />
            Kullanım Kılavuzu
          </Link>
          <button
            onClick={() => setShowKvkk(true)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#1e2a40]"
          >
            <FileText size={16} className="text-indigo-500" />
            KVKK Aydınlatma Metni
          </button>
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
