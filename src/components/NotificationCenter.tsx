"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  markAllAsRead,
  markAsRead,
  requestNotificationPermission,
  subscribeNotifications,
  triggerBrowserNotification,
} from "@/lib/services/notifications";
import type { AppNotification } from "@/lib/types";

export default function NotificationCenter() {
  const { profile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<AppNotification | null>(null);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // İlk yüklemede mevcut olanları bilmek için
  const initialLoadRef = useRef(true);
  const prevIdsRef = useRef<Set<string>>(new Set());

  // Tarayıcı bildirim izni kontrolü
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const dismissed = sessionStorage.getItem("notif_banner_dismissed");
    if (Notification.permission === "default" && !dismissed) {
      setShowPermissionBanner(true);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;

    return subscribeNotifications(profile.uid, (items) => {
      setNotifications(items);

      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        prevIdsRef.current = new Set(items.map((i) => i.id));
        return;
      }

      // Yeni gelen bildirimleri bul
      const newItems = items.filter((i) => !prevIdsRef.current.has(i.id) && !i.read);
      if (newItems.length > 0) {
        const latest = newItems[0];
        setToastNotif(latest);
        triggerBrowserNotification(latest.title, latest.body, latest.link || undefined);
        setTimeout(() => setToastNotif(null), 5000);
      }

      prevIdsRef.current = new Set(items.map((i) => i.id));
    });
  }, [profile]);

  if (!profile) return null;

  const unreadList = notifications.filter((n) => !n.read);
  const unreadCount = unreadList.length;

  async function handleItemClick(notif: AppNotification) {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function handleMarkAll() {
    const unreadIds = unreadList.map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllAsRead(unreadIds);
    }
  }

  async function handleAllowPermission() {
    const res = await requestNotificationPermission();
    if (res === "granted") {
      triggerBrowserNotification(
        "Bildirimler Etkinleştirildi! 🎉",
        "Ödev, ders ve soru güncellemelerini anında alacaksınız."
      );
    }
    setShowPermissionBanner(false);
  }

  function handleDismissBanner() {
    sessionStorage.setItem("notif_banner_dismissed", "true");
    setShowPermissionBanner(false);
  }

  return (
    <>
      {/* İzin İsteme Bannerı (Eğer henüz karar verilmemişse) */}
      {showPermissionBanner && (
        <div className="fixed top-3 inset-x-4 z-50 mx-auto max-w-lg rounded-2xl border border-indigo-200 bg-indigo-50/95 p-3.5 shadow-lg backdrop-blur-xs animate-in slide-in-from-top-3 dark:border-indigo-900/50 dark:bg-indigo-950/90">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <div>
                <p className="text-xs font-bold text-indigo-950 dark:text-indigo-100">
                  Bildirimleri Açın
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Yeni ödev, soru ve ders güncellemelerinden anında haberdar olun.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissBanner}
              className="text-indigo-400 hover:text-indigo-600"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={handleDismissBanner}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900"
            >
              Daha Sonra
            </button>
            <button
              onClick={handleAllowPermission}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              İzin Ver
            </button>
          </div>
        </div>
      )}

      {/* Ekran İçi Canlı Toast Bildirimi */}
      {toastNotif && (
        <div
          onClick={() => handleItemClick(toastNotif)}
          className="fixed top-4 inset-x-4 z-50 mx-auto max-w-sm cursor-pointer rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md transition hover:scale-102 dark:border-slate-800 dark:bg-[#151f31]/95 animate-in slide-in-from-top-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <Bell size={16} />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {toastNotif.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 dark:text-slate-300">
                  {toastNotif.body}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToastNotif(null);
              }}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Kapat"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Zil Butonu */}
      <div className="relative">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Bildirimler"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#0f172a]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Açılır Bildirim Paneli */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:absolute sm:inset-auto sm:right-0 sm:top-10 sm:p-0">
            {/* Arka plan karartması (mobilde) */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#151f31]">
              <div className="flex items-center justify-between border-b border-slate-100 p-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Bildirimler
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                      {unreadCount} yeni
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAll}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                    >
                      <CheckCheck size={13} />
                      Tümünü Oku
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Kapat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1 dark:divide-slate-800">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`flex w-full text-left items-start gap-3 rounded-xl p-3 transition ${
                      n.read
                        ? "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                        : "bg-indigo-50/50 text-slate-900 hover:bg-indigo-50 dark:bg-indigo-950/30 dark:text-slate-100 dark:hover:bg-indigo-950/50"
                    }`}
                  >
                    <div className="mt-1">
                      <span
                        className={`block h-2 w-2 rounded-full ${
                          n.read ? "bg-slate-200 dark:bg-slate-700" : "bg-indigo-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs font-semibold truncate ${
                            n.read ? "text-slate-700 dark:text-slate-300" : "text-indigo-950 dark:text-indigo-200"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.createdAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {n.createdAt.toDate().toLocaleTimeString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                        {n.body}
                      </p>
                      {n.link && (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          Görüntüle <ExternalLink size={10} />
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {notifications.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Henüz hiç bildiriminiz bulunmuyor.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
