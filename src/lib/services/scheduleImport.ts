import * as XLSX from "xlsx";
import { addLesson } from "@/lib/services/lessons";
import { addPlan } from "@/lib/services/plans";
import { createNotification } from "@/lib/services/notifications";
import { refreshParentView } from "@/lib/services/parent";
import { addDays, dateKey } from "@/lib/utils";

export interface ParsedScheduleItem {
  id: string;
  date?: string; // "YYYY-MM-DD" - Eğer programda net tarih varsa (10-15 günlük programlar için kritik)
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

export const TURKISH_MONTHS: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

/**
 * Excel hücrelerinden, metinlerden veya AI çıktısından her türlü tarihi ayrıştırır.
 * 10-15 günlük programlarda günlerin ardışık tarihlerini eksiksiz tespit eder.
 */
export function parseAnyDate(val: unknown): { isoDate: string; jsDate: Date } | null {
  if (!val) return null;

  // 1. JS Date nesnesi (XLSX cellDates: true)
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return {
      isoDate: `${y}-${m}-${d}`,
      jsDate: val,
    };
  }

  // 2. Excel seri numarası (örn: 45559)
  if (typeof val === "number" && val > 40000 && val < 60000) {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      const y = jsDate.getUTCFullYear();
      const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
      const d = String(jsDate.getUTCDate()).padStart(2, "0");
      return {
        isoDate: `${y}-${m}-${d}`,
        jsDate,
      };
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // 3. YYYY-MM-DD (ISO)
  const isoMatch = str.match(/\b(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const jsDate = new Date(y, m - 1, d);
      return {
        isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        jsDate,
      };
    }
  }

  // 4. DD.MM.YYYY veya DD/MM/YYYY veya DD-MM-YYYY
  const dmyMatch = str.match(/\b(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})\b/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const jsDate = new Date(y, m - 1, d);
      return {
        isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        jsDate,
      };
    }
  }

  // 5. Türkçe ay isimleri: "24 Eylül 2026" veya "24 Eylül"
  const trMonthMatch = str.match(
    /\b(\d{1,2})\s+([a-zçğıöşü]+)(?:\s+(\d{4}))?\b/i
  );
  if (trMonthMatch) {
    const d = parseInt(trMonthMatch[1], 10);
    const monthKey = trMonthMatch[2].toLowerCase();
    const monthNum = TURKISH_MONTHS[monthKey];
    if (monthNum && d >= 1 && d <= 31) {
      const currentYear = new Date().getFullYear();
      const y = trMonthMatch[3] ? parseInt(trMonthMatch[3], 10) : currentYear;
      const jsDate = new Date(y, monthNum - 1, d);
      return {
        isoDate: `${y}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        jsDate,
      };
    }
  }

  // 6. DD.MM veya DD/MM (Yıl belirtilmemişse geçerli yıl)
  const dmMatch = str.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (dmMatch) {
    const d = parseInt(dmMatch[1], 10);
    const m = parseInt(dmMatch[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const y = new Date().getFullYear();
      const jsDate = new Date(y, m - 1, d);
      return {
        isoDate: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        jsDate,
      };
    }
  }

  return null;
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
  // cellDates: true ile Excel içindeki tarih hücrelerini otomatik JS Date olarak oku
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
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

    // Satırdaki kesin tarihi (örn: 24.09.2026) veya gün adını bul
    let rowIsoDate: string | undefined;
    let rowDay = "";
    let rowDayOffset = -1;
    let explicitTime = "";

    // 1. Önce satırdaki kesin tarihi veya saati ara
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === null || cell === undefined || cell === "") continue;

      const cellStr = String(cell).trim();

      // Saat mi? (örn: 17:00, 16.30)
      if (/^\b\d{1,2}[:.]\d{2}\b$/.test(cellStr)) {
        explicitTime = cellStr.replace(".", ":");
        continue;
      }

      // Tarih mi? (örn: 24.09.2026, 2026-09-24, 24 Eylül vb.)
      const parsedDate = parseAnyDate(cell);
      if (parsedDate) {
        rowIsoDate = parsedDate.isoDate;
        const jsDay = parsedDate.jsDate.getDay();
        rowDayOffset = jsDay === 0 ? 6 : jsDay - 1;
        rowDay = DAY_NAMES[rowDayOffset];
        break;
      }
    }

    // 2. Eğer kesin tarih bulunamadıysa metinsel gün adını ara (Pazartesi, Salı...)
    if (rowDayOffset === -1) {
      for (let c = 0; c < row.length; c++) {
        const cellStr = String(row[c] ?? "").trim();
        if (!cellStr) continue;

        for (const [key, offset] of Object.entries(DAY_NORM_MAP)) {
          const regex = new RegExp(`^${key}$`, "i");
          if (regex.test(cellStr)) {
            rowDay = DAY_NAMES[offset];
            rowDayOffset = offset;
            break;
          }
        }
        if (rowDayOffset !== -1) break;
      }
    }

    // Eğer bu satır bir tarihe veya güne aitse, satırdaki ders/blok içeriklerini topla
    if (rowDayOffset !== -1) {
      let dailyBlockCount = 0;

      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell === null || cell === undefined || cell === "") continue;

        const cellStr = String(cell).trim();
        if (!cellStr || cellStr === "—" || cellStr === "-" || cellStr === "0") continue;

        // Tarih hücresi, gün adı, başlık veya sadece sayı olan hücreleri atla
        if (parseAnyDate(cell)) continue;
        if (Object.keys(DAY_NORM_MAP).some((d) => cellStr.toLowerCase() === d)) continue;
        if (/^\d+$/.test(cellStr)) continue; // Sadece sayı (toplam soru, doğru vb.)
        if (cellStr.toLowerCase().includes("toplam") || cellStr.toLowerCase().includes("hafta:")) continue;

        // Ders / Blok içeriği çıkar
        const parsed = parseCellStudyContent(cellStr);
        if (parsed && parsed.subject) {
          const timeToUse =
            explicitTime ||
            BLOCK_DEFAULT_TIMES[dailyBlockCount % BLOCK_DEFAULT_TIMES.length] ||
            "16:00";

          items.push({
            id: `excel-row-${r}-col-${c}-${Date.now()}`,
            date: rowIsoDate,
            day: rowDay,
            dayOffset: rowDayOffset,
            time: timeToUse,
            durationMinutes: 60,
            subject: parsed.subject,
            topic: parsed.topic,
            targetQuestions: parsed.targetQuestions,
            note: cellStr !== parsed.subject ? cellStr : undefined,
          });

          dailyBlockCount++;
          blockTimeIndex++;
        }
      }
    }
  }

  if (items.length > 0) {
    // Kronolojik sıralama: Tarih varsa tarihe göre, yoksa haftalık gün sırasına göre
    items.sort((a, b) => {
      if (a.date && b.date) {
        const dComp = a.date.localeCompare(b.date);
        if (dComp !== 0) return dComp;
      } else if (a.date && !b.date) {
        return -1;
      } else if (!a.date && b.date) {
        return 1;
      } else {
        const dayComp = a.dayOffset - b.dayOffset;
        if (dayComp !== 0) return dayComp;
      }
      return a.time.localeCompare(b.time);
    });
    return items;
  }

  throw new Error(
    "Tablodan geçerli ders veya gün satırı okunamadı. Lütfen satırlarda Gün (Pazartesi, Salı...) veya Tarih (24.09.2026 gibi) yer aldığından emin olun."
  );
}

/**
 * Görsel veya PDF programını Gemini AI API üzerinden ayrıştırır.
 * 10-15 günlük veya çok haftalık uzun programları da eksiksiz analiz eder.
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
        date?: string;
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
      let isoDate: string | undefined;
      let dayStr = it.day || "Pazartesi";
      let offset = getDayOffset(dayStr);

      if (it.date) {
        const parsedD = parseAnyDate(it.date);
        if (parsedD) {
          isoDate = parsedD.isoDate;
          const jsDay = parsedD.jsDate.getDay();
          offset = jsDay === 0 ? 6 : jsDay - 1;
          dayStr = DAY_NAMES[offset];
        }
      }

      let timeStr = (it.time || "16:00").trim();
      if (!timeStr.includes(":")) timeStr = `${timeStr}:00`;

      return {
        id: `ai-${idx}-${Date.now()}`,
        date: isoDate,
        day: dayStr,
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

  // Kronolojik sıralama: Tarih varsa tarihe göre, yoksa gün ve saate göre
  items.sort((a, b) => {
    if (a.date && b.date) {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
    } else if (a.date && !b.date) {
      return -1;
    } else if (!a.date && b.date) {
      return 1;
    } else {
      const dayComp = a.dayOffset - b.dayOffset;
      if (dayComp !== 0) return dayComp;
    }
    return a.time.localeCompare(b.time);
  });

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
  targetMondayDate: Date; // Hedef haftanın Pazartesi günü (tarih belirtilmeyen satırlar için fallback)
  importMode: "LESSONS" | "STUDY_PLAN" | "BOTH";
  defaultPrice?: number;
}): Promise<{ addedLessons: number; addedPlans: number }> {
  let addedLessons = 0;
  let addedPlans = 0;

  for (const item of params.items) {
    let itemDate: Date;

    // Eğer dersin kesin tarihi varsa (YYYY-MM-DD), doğrudan o tarihi kullan (10-15 günlük programlar için)
    if (item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      const [y, m, d] = item.date.split("-").map(Number);
      itemDate = new Date(y, m - 1, d);
    } else {
      // Tarih belirtilmemişse seçilen haftanın Pazartesi gününe dayOffset ekle
      itemDate = addDays(params.targetMondayDate, item.dayOffset);
    }

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
  const hasExactDates = params.items.some((it) => !!it.date);
  const modeText =
    params.importMode === "BOTH"
      ? "canlı dersleriniz ve çalışma programınız"
      : params.importMode === "LESSONS"
      ? "canlı dersleriniz"
      : "çalışma programınız";

  const notifBody = hasExactDates
    ? `Öğretmeniniz takviminize ${params.items.length} adet ders ve çalışma görevi ekledi.`
    : `Öğretmeniniz bu haftaki ${modeText} için takviminizi güncelledi.`;

  createNotification({
    recipientId: params.studentId,
    senderId: params.teacherId,
    senderName: "Öğretmeniniz",
    title: "📅 Yeni Ders Programınız Takvime Dağıtıldı!",
    body: notifBody,
    link: params.importMode === "STUDY_PLAN" ? "/panel/program" : "/panel/takvim",
  }).catch(() => {});

  return { addedLessons, addedPlans };
}
