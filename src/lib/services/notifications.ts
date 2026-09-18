import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppNotification } from "@/lib/types";

/**
 * Yeni bildirim oluşturur.
 */
export async function createNotification(data: {
  recipientId: string;
  senderId?: string;
  senderName?: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db(), "notifications"), {
      recipientId: data.recipientId,
      senderId: data.senderId || null,
      senderName: data.senderName || null,
      title: data.title,
      body: data.body,
      link: data.link || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Bildirim oluşturulamadı:", error);
  }
}

/**
 * Kullanıcının bildirimlerini gerçek zamanlı dinler.
 */
export function subscribeNotifications(
  recipientId: string,
  cb: (items: AppNotification[]) => void
): () => void {
  const q = query(
    collection(db(), "notifications"),
    where("recipientId", "==", recipientId),
    limit(40)
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
    list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    cb(list);
  });
}

/**
 * Bildirimi okundu olarak işaretler.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db(), "notifications", notificationId), { read: true });
  } catch (e) {
    console.error("Bildirim okundu yapılamadı:", e);
  }
}

/**
 * Tüm okunmamış bildirimleri okundu olarak işaretler.
 */
export async function markAllAsRead(notificationIds: string[]): Promise<void> {
  await Promise.all(
    notificationIds.map((id) =>
      updateDoc(doc(db(), "notifications", id), { read: true }).catch(() => {})
    )
  );
}

/**
 * Tarayıcı Web Notification izni ister.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return await Notification.requestPermission();
}

/**
 * Hafif bir bildirim sesi çalar (Web Audio API). Harici ses dosyası gerektirmez.
 */
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ses çalma tarayıcı politikasına takılırsa sessizce devam eder
  }
}

/**
 * Tarayıcı masaüstü/mobil sistem bildirimi gönderir.
 */
export function triggerBrowserNotification(title: string, body: string, link?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    playNotificationSound();
    const notif = new Notification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      tag: title,
    });

    if (link) {
      notif.onclick = (e) => {
        e.preventDefault();
        window.focus();
        window.location.href = link;
      };
    }
  } catch {
    // Mobil tarayıcılar (Service Worker gerektirenler) için Service Worker üzerinden tetiklemeyi dener
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "/icon.png",
            badge: "/icon.png",
            data: { url: link || "/panel" },
          });
        })
        .catch(() => {});
    }
  }
}
