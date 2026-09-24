import * as XLSX from "xlsx";
import { addLesson } from "@/lib/services/lessons";
import { addPlan } from "@/lib/services/plans";
import { createNotification } from "@/lib/services/notifications";
import { refreshParentView } from "@/lib/services/parent";
import { addDays, dateKey } from "@/lib/utils";

export interface ParsedScheduleItem {
  id: string;
  day: string;
  dayOffset: number; // 0: Pazartesi, 1: Salı, ..., 6: Pazar
  time: string; // "17:00"
  durationMinutes: number; // 60
  subject: string;
  topic?: string;
  targetQuestions?: number;
  note?: string;
}

export const DAY_NAMES = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

const DAY_NORM_MAP: Record<string, number> = {
  pazartesi: 0,
  pzt: 0,
  mon: 0,
  monday: 0,
  salı: 1,
  sali: 1,
  sal: 1,
  tue: 1,
  tuesday: 1,
  çarşamba: 2,
  carsamba: 2,
  çar: 2,
  car: 2,
  wed: 2,
  wednesday: 2,
  perşembe: 3,
  persembe: 3,
  per: 3,
  thu: 3,
  thursday: 3,
  cuma: 4,
  cum: 4,
  fri: 4,
  friday: 4,
  cumartesi: 5,
  cmt: 5,
  sat: 5,
  saturday: 5,
  pazar: 6,
  paz: 6,
  sun: 6,
  sunday: 6,
};

export function getDayOffset(dayStr: string): number {
  if (!dayStr) return 0;
  const clean = dayStr
    .toLowerCase()
    .replace(/[^a-zıİğĞüÜşŞöÖçÇ]/gi, "")
    .trim();
  for (const [key, offset] of Object.entries(DAY_NORM_MAP)) {
    if (clean.includes(key)) return offset;
  }
  return 0;
}

/**
 * Excel (.xlsx, .xls) veya CSV dosyasını okuyarak yapılandırılmış ders programı listesine çevirir.
 */
export async function parseExcelSchedule(file: File): Promise<ParsedScheduleItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Excel dosyasında sayfa bulunamadı.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("Excel tablosu boş veya okunamadı.");
  }

  // 1. Önce standart sütunlu tablo formatını kontrol et (Gün, Saat, Ders...)
  const items: ParsedScheduleItem[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const keys = Object.keys(row);

    // Anahtar isimlerini normalize et
    let dayVal = "";
    let timeVal = "";
    let durationVal = 60;
    let subjectVal = "";
    let topicVal = "";
    let questionsVal = 0;
    let noteVal = "";

    for (const k of keys) {
      const lk = k.toLowerCase().trim();
      const val = String(row[k] ?? "").trim();
      if (!val) continue;

      if (lk.includes("gün") || lk.includes("gun") || lk === "day") {
        dayVal = val;
      } else if (
        lk.includes("saat") ||
        lk.includes("time") ||
        lk.includes("zaman")
      ) {
        timeVal = val;
      } else if (
        lk.includes("süre") ||
        lk.includes("sure") ||
        lk.includes("dakika") ||
        lk.includes("duration")
      ) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) durationVal = num;
      } else if (
        lk.includes("ders") ||
        lk.includes("subject") ||
        lk.includes("branş") ||
        lk.includes("brans")
      ) {
        subjectVal = val;
      } else if (
        lk.includes("konu") ||
        lk.includes("topic") ||
        lk.includes("ünite")
      ) {
        topicVal = val;
      } else if (
        lk.includes("soru") ||
        lk.includes("adet") ||
        lk.includes("hedef")
      ) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) questionsVal = num;
      } else if (
        lk.includes("not") ||
        lk.includes("açıklama") ||
        lk.includes("aciklama")
      ) {
        noteVal = val;
      }
    }

    if (subjectVal || dayVal) {
      const offset = getDayOffset(dayVal);
      // Saat formatını temizle (örn: 17, 17:00, 17.00)
      let cleanTime = timeVal.replace(".", ":").trim();
      if (!cleanTime.includes(":")) {
        const h = parseInt(cleanTime, 10);
        if (!isNaN(h) && h >= 0 && h <= 23) {
          cleanTime = `${String(h).padStart(2, "0")}:00`;
        } else {
          cleanTime = "16:00";
        }
      }

      items.push({
        id: `excel-${i}-${Date.now()}`,
        day: DAY_NAMES[offset],
        dayOffset: offset,
        time: cleanTime || "16:00",
        durationMinutes: durationVal || 60,
        subject: subjectVal || "Genel Çalışma",
        topic: topicVal || undefined,
        targetQuestions: questionsVal || undefined,
        note: noteVal || undefined,
      });
    }
  }

  if (items.length > 0) {
    items.sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
    return items;
  }

  throw new Error(
    "Tablodan geçerli ders verisi okunamadı. Lütfen sütun başlıklarında Gün, Saat, Ders gibi ifadelerin yer aldığından emin olun veya örnek şablonu indirin."
  );
}

/**
 * Örnek Excel Ders Programı Şablonu Üretir ve İndirir
 */
export function downloadSampleScheduleExcel(): void {
  const sampleData = [
    {
      "Gün": "Pazartesi",
      "Saat": "17:00",
      "Süre (Dakika)": 60,
      "Ders": "Matematik",
      "Konu / Hedef": "Üslü ve Köklü İfadeler",
      "Hedef Soru": 50,
      "Not / Açıklama": "Konu anlatımı ve test çözümü",
    },
    {
      "Gün": "Salı",
      "Saat": "18:30",
      "Süre (Dakika)": 45,
      "Ders": "Fizik",
      "Konu / Hedef": "Kuvvet ve Hareket",
      "Hedef Soru": 35,
      "Not / Açıklama": "Soru kumbarasındaki sorular kontrol edilecek",
    },
    {
      "Gün": "Çarşamba",
      "Saat": "16:00",
      "Süre (Dakika)": 60,
      "Ders": "Türkçe",
      "Konu / Hedef": "Paragrafta Anlam",
      "Hedef Soru": 40,
      "Not / Açıklama": "Hızlı okuma ve paragraf etüdü",
    },
    {
      "Gün": "Perşembe",
      "Saat": "17:30",
      "Süre (Dakika)": 60,
      "Ders": "Kimya",
      "Konu / Hedef": "Kimyasal Türler Arası Etkileşimler",
      "Hedef Soru": 30,
      "Not / Açıklama": "MEB kazanım testi çözülecek",
    },
    {
      "Gün": "Cuma",
      "Saat": "18:00",
      "Süre (Dakika)": 45,
      "Ders": "Biyoloji",
      "Konu / Hedef": "Hücre ve Organelleri",
      "Hedef Soru": 40,
      "Not / Açıklama": "Haftalık tekrar",
    },
    {
      "Gün": "Cumartesi",
      "Saat": "10:30",
      "Süre (Dakika)": 90,
      "Ders": "Geometri",
      "Konu / Hedef": "Üçgende Açılar",
      "Hedef Soru": 60,
      "Not / Açıklama": "Hafta sonu etüt çalışması",
    },
    {
      "Gün": "Pazar",
      "Saat": "14:00",
      "Süre (Dakika)": 60,
      "Ders": "Genel Deneme",
      "Konu / Hedef": "Haftalık Branş Denemesi",
      "Hedef Soru": 90,
      "Not / Açıklama": "Deneme sınavı ve yanlış analizi",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Sütun genişlikleri
  ws["!cols"] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 32 },
    { wch: 12 },
    { wch: 35 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ders Programı");
  XLSX.writeFile(wb, "Haftalik_Ders_Programi_Sablonu.xlsx");
}

/**
 * Görsel veya PDF programını Gemini AI API üzerinden ayrıştırır.
 */
export async function parseAISchedule(params: {
  file: File;
  apiKey?: string;
}): Promise<ParsedScheduleItem[]> {
  const formData = new FormData();
  formData.append("file", params.file);
  if (params.apiKey) {
    formData.append("apiKey", params.apiKey);
  }

  const res = await fetch("/api/ai/parse-schedule", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Program görseli yapay zeka ile okunamadı.");
  }

  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length === 0) {
    throw new Error(
      "Görselden veya PDF'ten herhangi bir ders bulunamadı. Lütfen daha net bir fotoğraf deneyin veya Excel yükleyin."
    );
  }

  const items: ParsedScheduleItem[] = rawItems.map(
    (
      it: {
        day?: string;
        time?: string;
        durationMinutes?: number;
        subject?: string;
        topic?: string;
        targetQuestions?: number;
        note?: string;
      },
      idx: number
    ) => {
      const dayStr = it.day || "Pazartesi";
      const offset = getDayOffset(dayStr);
      let timeStr = (it.time || "16:00").trim();
      if (!timeStr.includes(":")) timeStr = `${timeStr}:00`;

      return {
        id: `ai-${idx}-${Date.now()}`,
        day: DAY_NAMES[offset],
        dayOffset: offset,
        time: timeStr,
        durationMinutes: it.durationMinutes || 60,
        subject: it.subject || "Ders",
        topic: it.topic || undefined,
        targetQuestions: it.targetQuestions || undefined,
        note: it.note || undefined,
      };
    }
  );

  items.sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
  return items;
}

/**
 * Ayrıştırılan ders programını Firestore'a topluca aktarır.
 */
export async function executeScheduleImport(params: {
  studentId: string;
  studentName: string;
  teacherId: string;
  items: ParsedScheduleItem[];
  targetMondayDate: Date; // Hedef haftanın Pazartesi günü
  importMode: "LESSONS" | "STUDY_PLAN" | "BOTH";
  defaultPrice?: number;
}): Promise<{ addedLessons: number; addedPlans: number }> {
  let addedLessons = 0;
  let addedPlans = 0;

  for (const item of params.items) {
    const itemDate = addDays(params.targetMondayDate, item.dayOffset);

    // Saat ayrıştırma (örn: "17:30")
    const [hStr, mStr] = item.time.split(":");
    const hours = parseInt(hStr || "16", 10);
    const minutes = parseInt(mStr || "0", 10);

    const lessonStart = new Date(itemDate);
    lessonStart.setHours(hours, minutes, 0, 0);

    // 1. Canlı Ders Takvimine Dağıt
    if (params.importMode === "LESSONS" || params.importMode === "BOTH") {
      await addLesson({
        teacherId: params.teacherId,
        studentId: params.studentId,
        studentName: params.studentName,
        startTime: lessonStart,
        durationMinutes: item.durationMinutes,
        subject: item.subject,
        price: params.defaultPrice ?? 0,
        paymentStatus: "UNPAID",
      });
      addedLessons++;
    }

    // 2. Çalışma ve Ödev Programına Dağıt
    if (params.importMode === "STUDY_PLAN" || params.importMode === "BOTH") {
      const dayKey = dateKey(itemDate);
      const title = item.topic
        ? `${item.subject}: ${item.topic}`
        : `${item.subject} Çalışması`;

      await addPlan({
        teacherId: params.teacherId,
        studentId: params.studentId,
        type: "DAILY",
        periodKey: dayKey,
        title,
        subject: item.subject,
        topic: item.topic || "",
        targetQuestions: item.targetQuestions || 0,
      });
      addedPlans++;
    }
  }

  // Veli görünümünü senkronize et
  refreshParentView(params.studentId).catch(() => {});

  // Öğrenciye bildirim gönder
  const modeText =
    params.importMode === "BOTH"
      ? "canlı dersleriniz ve çalışma programınız"
      : params.importMode === "LESSONS"
      ? "canlı dersleriniz"
      : "haftalık çalışma programınız";

  createNotification({
    recipientId: params.studentId,
    senderId: params.teacherId,
    senderName: "Öğretmeniniz",
    title: "📅 Yeni Programınız Takvime Dağıtıldı!",
    body: `Öğretmeniniz bu haftaki ${modeText} için takviminizi güncelledi.`,
    link: params.importMode === "STUDY_PLAN" ? "/panel/program" : "/panel/takvim",
  }).catch(() => {});

  return { addedLessons, addedPlans };
}
