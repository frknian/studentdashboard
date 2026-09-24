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
 * Hücre metninden ders adı, konu ve soru hedefini ayrıştırır.
 * Örn: "Fen Bilimleri: Okul Konusu Tekrarı + 30 Soru" ->
 * subject: "Fen Bilimleri", topic: "Okul Konusu Tekrarı", targetQuestions: 30
 */
function parseCellStudyContent(rawText: string): {
  subject: string;
  topic?: string;
  targetQuestions?: number;
} | null {
  const str = rawText.trim();
  if (!str || str === "—" || str === "-" || str === "0") return null;

  // Soru sayısı çıkar (örn: "30 Soru", "20 Zor Soru", "20 Paragraf")
  let targetQuestions: number | undefined;
  const qMatch = str.match(/(\d+)\s*(soru|test|paragraf)/i);
  if (qMatch) {
    targetQuestions = parseInt(qMatch[1], 10);
  }

  // Özel durum: "20 Paragraf"
  if (/^\d+\s*paragraf$/i.test(str)) {
    return {
      subject: "Türkçe",
      topic: "Paragraf Rutini",
      targetQuestions: targetQuestions || 20,
    };
  }

  // Ders: Konu formatı (örn: "Fen Bilimleri: Okul Konusu Tekrarı + 30 Soru")
  if (str.includes(":")) {
    const [subPart, ...restParts] = str.split(":");
    const topicPart = restParts
      .join(":")
      .replace(/\+\s*\d+\s*(soru|zor soru|test)/gi, "")
      .trim();

    return {
      subject: subPart.trim(),
      topic: topicPart || undefined,
      targetQuestions,
    };
  }

  // Yaygın ders kontrolü
  const POPULAR_SUBJECTS = [
    "Matematik",
    "Geometri",
    "Fen Bilimleri",
    "Fen",
    "Fizik",
    "Kimya",
    "Biyoloji",
    "Türkçe",
    "Paragraf",
    "Din Kültürü",
    "Din",
    "T.C. İnkılap Tarihi",
    "İnkılap",
    "Tarih",
    "Coğrafya",
    "İngilizce",
    "Sözel Karma",
    "Haftalık Deneme",
    "Deneme",
    "Hata Analizi",
  ];

  for (const s of POPULAR_SUBJECTS) {
    if (str.toLowerCase().startsWith(s.toLowerCase())) {
      const topic = str
        .slice(s.length)
        .replace(/^[:\-–\s]+/, "")
        .replace(/\+\s*\d+\s*(soru|test)/gi, "")
        .trim();
      return {
        subject: s,
        topic: topic || undefined,
        targetQuestions,
      };
    }
  }

  return {
    subject: str.slice(0, 30),
    targetQuestions,
  };
}

/**
 * Universal Excel Parser:
 * Başlık satırları, birleştirilmiş hücreler, blok sütunları (Blok 1, Blok 2, Blok 3)
 * ve matris formatları dahil HER TÜRLÜ Excel programını okur.
 */
export async function parseExcelSchedule(file: File): Promise<ParsedScheduleItem[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Excel dosyasında sayfa bulunamadı.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  // 2D dizi olarak tüm satırları al
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (!rows || rows.length === 0) {
    throw new Error("Excel tablosu boş veya okunamadı.");
  }

  const items: ParsedScheduleItem[] = [];
  let blockTimeIndex = 0;
  const BLOCK_DEFAULT_TIMES = ["16:00", "17:30", "19:00", "20:30"];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    // Satırdaki gün veya tarihi bul
    let rowDay = "";
    let rowDayOffset = -1;
    let explicitTime = "";

    // 1. Önce gün hücresini ara
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "").trim();
      if (!cell) continue;

      // Saat mi?
      if (/^\b\d{1,2}[:.]\d{2}\b$/.test(cell)) {
        explicitTime = cell.replace(".", ":");
        continue;
      }

      // Gün adı mı?
      for (const [key, offset] of Object.entries(DAY_NORM_MAP)) {
        const regex = new RegExp(`^${key}$`, "i");
        if (regex.test(cell)) {
          rowDay = DAY_NAMES[offset];
          rowDayOffset = offset;
          break;
        }
      }
      if (rowDayOffset !== -1) break;
    }

    // 2. Eğer gün doğrudan bulunamadıysa Tarih hücresinden çıkar (örn: 24.09.2026)
    if (rowDayOffset === -1) {
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? "").trim();
        const dateMatch = cell.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
        if (dateMatch) {
          const dayNum = parseInt(dateMatch[1], 10);
          const monthNum = parseInt(dateMatch[2], 10) - 1;
          const yearNum = parseInt(dateMatch[3], 10);
          const parsedD = new Date(yearNum, monthNum, dayNum);
          if (!isNaN(parsedD.getTime())) {
            // JS getDay(): 0: Pazar, 1: Pzt... Bizim offset: 0: Pzt ... 6: Pazar
            const jsDay = parsedD.getDay();
            rowDayOffset = jsDay === 0 ? 6 : jsDay - 1;
            rowDay = DAY_NAMES[rowDayOffset];
            break;
          }
        }
      }
    }

    // Eğer bu satır bir güne ait bir veri satırıysa, satırdaki tüm ders/blok içeriklerini topla
    if (rowDayOffset !== -1) {
      let dailyBlockCount = 0;

      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] ?? "").trim();
        if (!cell || cell === "—" || cell === "-" || cell === "0") continue;

        // Tarih, gün adı, başlık veya sadece sayı olan hücreleri atla
        if (/^\d{1,2}[./]\d{1,2}[./]\d{4}$/.test(cell)) continue;
        if (Object.keys(DAY_NORM_MAP).some((d) => cell.toLowerCase() === d)) continue;
        if (/^\d+$/.test(cell)) continue; // Sadece sayı (toplam soru, doğru vb.)
        if (cell.toLowerCase().includes("toplam") || cell.toLowerCase().includes("hafta:")) continue;

        // Ders / Blok içeriği çıkar
        const parsed = parseCellStudyContent(cell);
        if (parsed && parsed.subject) {
          const timeToUse =
            explicitTime ||
            BLOCK_DEFAULT_TIMES[dailyBlockCount % BLOCK_DEFAULT_TIMES.length] ||
            "16:00";

          items.push({
            id: `excel-row-${r}-col-${c}-${Date.now()}`,
            day: rowDay,
            dayOffset: rowDayOffset,
            time: timeToUse,
            durationMinutes: 60,
            subject: parsed.subject,
            topic: parsed.topic,
            targetQuestions: parsed.targetQuestions,
            note: cell !== parsed.subject ? cell : undefined,
          });

          dailyBlockCount++;
          blockTimeIndex++;
        }
      }
    }
  }

  if (items.length > 0) {
    items.sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
    return items;
  }

  throw new Error(
    "Tablodan geçerli ders veya gün satırı okunamadı. Lütfen satırlarda Gün (Pazartesi, Salı...) veya Tarih (24.09.2026 gibi) yer aldığından emin olun."
  );
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
    throw new Error(data?.error || "Program görseli okunamadı.");
  }

  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length === 0) {
    throw new Error(
      "Görselden veya PDF'ten herhangi bir ders bulunamadı. Lütfen daha net bir görsel deneyin."
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
 * Kullanıcının görselindeki gibi 3 Bloklu (Paragraf + Sayısal + Sözel)
 * LGS & YKS Hazır Çalışma Şablonu Üretir
 */
export function getSampleBlockScheduleTemplate(): ParsedScheduleItem[] {
  return [
    // Perşembe
    {
      id: `tmpl-per-1-${Date.now()}`,
      day: "Perşembe",
      dayOffset: 3,
      time: "16:00",
      durationMinutes: 45,
      subject: "Türkçe",
      topic: "Paragraf Rutini",
      targetQuestions: 20,
    },
    {
      id: `tmpl-per-2-${Date.now()}`,
      day: "Perşembe",
      dayOffset: 3,
      time: "17:30",
      durationMinutes: 60,
      subject: "Fen Bilimleri",
      topic: "Okul Konusu Tekrarı",
      targetQuestions: 30,
    },
    {
      id: `tmpl-per-3-${Date.now()}`,
      day: "Perşembe",
      dayOffset: 3,
      time: "19:00",
      durationMinutes: 45,
      subject: "Din Kültürü",
      topic: "Okul Konusu Tekrarı",
      targetQuestions: 20,
    },
    // Cuma
    {
      id: `tmpl-cum-1-${Date.now()}`,
      day: "Cuma",
      dayOffset: 4,
      time: "16:00",
      durationMinutes: 45,
      subject: "Türkçe",
      topic: "Paragraf Rutini",
      targetQuestions: 20,
    },
    {
      id: `tmpl-cum-2-${Date.now()}`,
      day: "Cuma",
      dayOffset: 4,
      time: "17:30",
      durationMinutes: 60,
      subject: "Matematik",
      topic: "Okul Konusu & Haftalık Tarama",
      targetQuestions: 30,
    },
    {
      id: `tmpl-cum-3-${Date.now()}`,
      day: "Cuma",
      dayOffset: 4,
      time: "19:00",
      durationMinutes: 45,
      subject: "Türkçe",
      topic: "Okul Konusu (Dil Bilgisi / Anlam)",
      targetQuestions: 25,
    },
    // Cumartesi
    {
      id: `tmpl-cmt-1-${Date.now()}`,
      day: "Cumartesi",
      dayOffset: 5,
      time: "10:30",
      durationMinutes: 45,
      subject: "Türkçe",
      topic: "Paragraf Rutini",
      targetQuestions: 20,
    },
    {
      id: `tmpl-cmt-2-${Date.now()}`,
      day: "Cumartesi",
      dayOffset: 5,
      time: "11:30",
      durationMinutes: 60,
      subject: "Fen Bilimleri",
      topic: "Fen Bilimleri + Matematik Zor Soru",
      targetQuestions: 50,
    },
    {
      id: `tmpl-cmt-3-${Date.now()}`,
      day: "Cumartesi",
      dayOffset: 5,
      time: "14:00",
      durationMinutes: 45,
      subject: "Sözel Karma",
      topic: "İnkılap + İngilizce + Din",
      targetQuestions: 30,
    },
    // Pazar
    {
      id: `tmpl-paz-1-${Date.now()}`,
      day: "Pazar",
      dayOffset: 6,
      time: "14:00",
      durationMinutes: 90,
      subject: "Hata Analizi",
      topic: "Haftalık Hata & Boş Soru Analizi",
      targetQuestions: 0,
      note: "Tekrar Çözüm ve Değerlendirme",
    },
  ];
}

/**
 * 1 Tıkla Haftalık Hazır Boş Şablon Getirir (Pazartesi - Pazar)
 */
export function getEmptyWeeklyTemplate(): ParsedScheduleItem[] {
  return [
    {
      id: `tmpl-0-${Date.now()}`,
      day: "Pazartesi",
      dayOffset: 0,
      time: "17:00",
      durationMinutes: 60,
      subject: "Matematik",
      topic: "",
      targetQuestions: 40,
    },
    {
      id: `tmpl-1-${Date.now()}`,
      day: "Salı",
      dayOffset: 1,
      time: "17:00",
      durationMinutes: 60,
      subject: "Fizik",
      topic: "",
      targetQuestions: 30,
    },
    {
      id: `tmpl-2-${Date.now()}`,
      day: "Çarşamba",
      dayOffset: 2,
      time: "16:00",
      durationMinutes: 60,
      subject: "Türkçe",
      topic: "",
      targetQuestions: 40,
    },
    {
      id: `tmpl-3-${Date.now()}`,
      day: "Perşembe",
      dayOffset: 3,
      time: "17:30",
      durationMinutes: 60,
      subject: "Kimya",
      topic: "",
      targetQuestions: 30,
    },
    {
      id: `tmpl-4-${Date.now()}`,
      day: "Cuma",
      dayOffset: 4,
      time: "18:00",
      durationMinutes: 60,
      subject: "Biyoloji",
      topic: "",
      targetQuestions: 30,
    },
    {
      id: `tmpl-5-${Date.now()}`,
      day: "Cumartesi",
      dayOffset: 5,
      time: "10:30",
      durationMinutes: 90,
      subject: "Geometri",
      topic: "",
      targetQuestions: 50,
    },
    {
      id: `tmpl-6-${Date.now()}`,
      day: "Pazar",
      dayOffset: 6,
      time: "14:00",
      durationMinutes: 60,
      subject: "Haftalık Deneme",
      topic: "Deneme Analizi",
      targetQuestions: 90,
    },
  ];
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
