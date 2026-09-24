"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Key,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StudentPicker from "@/components/StudentPicker";
import {
  DAY_NAMES,
  downloadSampleScheduleExcel,
  executeScheduleImport,
  parseAISchedule,
  parseExcelSchedule,
  type ParsedScheduleItem,
} from "@/lib/services/scheduleImport";
import { addDays, mondayOf } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: UserProfile[];
  initialStudentId?: string;
  initialImportMode?: "LESSONS" | "STUDY_PLAN" | "BOTH";
  onSuccess?: () => void;
}

export default function ScheduleImportModal({
  isOpen,
  onClose,
  students,
  initialStudentId,
  initialImportMode = "LESSONS",
  onSuccess,
}: Props) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedStudentId, setSelectedStudentId] = useState(
    initialStudentId || students[0]?.uid || ""
  );
  const [importMode, setImportMode] = useState<"LESSONS" | "STUDY_PLAN" | "BOTH">(
    initialImportMode
  );

  // Hafta seçimi: 0: bu hafta, 1: gelecek hafta, 2: iki hafta sonra
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Dosya & Ayrıştırma state'leri
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedScheduleItem[] | null>(null);

  // Gemini API key state'i (localStorage destekli)
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Aktarma durumu
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Varsayılan ders ücreti
  const [defaultPrice, setDefaultPrice] = useState<number>(0);

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].uid);
    }
  }, [initialStudentId, students, selectedStudentId]);

  useEffect(() => {
    // Tarayıcıdaki kayıtlı API anahtarını yükle
    const savedKey = localStorage.getItem("gemini_user_api_key") || "";
    setGeminiApiKey(savedKey);
  }, []);

  // Hedef Pazartesi tarihi
  const targetMonday = useMemo(() => {
    const base = mondayOf();
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const start = targetMonday;
    const end = addDays(start, 6);
    const startStr = `${start.getDate()} ${start.toLocaleDateString("tr-TR", { month: "short" })}`;
    const endStr = `${end.getDate()} ${end.toLocaleDateString("tr-TR", { month: "short" })}`;
    if (weekOffset === 0) return `Bu Hafta (${startStr} - ${endStr})`;
    if (weekOffset === 1) return `Gelecek Hafta (${startStr} - ${endStr})`;
    return `${startStr} - ${endStr}`;
  }, [targetMonday, weekOffset]);

  if (!isOpen) return null;

  const selectedStudent = students.find((s) => s.uid === selectedStudentId);

  async function handleFileSelected(f: File | null, customKey?: string) {
    if (!f) return;
    setFile(f);
    setError(null);
    setParsedItems(null);
    setImportSuccess(null);
    setAnalyzing(true);

    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    const isExcel = ["xlsx", "xls", "csv"].includes(ext);
    const isImageOrPdf =
      ["png", "jpg", "jpeg", "webp", "pdf"].includes(ext) ||
      f.type.startsWith("image/") ||
      f.type === "application/pdf";

    try {
      if (isExcel) {
        const items = await parseExcelSchedule(f);
        setParsedItems(items);
      } else if (isImageOrPdf) {
        const rawKey = customKey ?? geminiApiKey;
        const keyToUse = rawKey.replace(/['"\s]/g, "") || undefined;
        const items = await parseAISchedule({ file: f, apiKey: keyToUse });
        setParsedItems(items);
      } else {
        throw new Error(
          "Desteklenmeyen dosya türü. Lütfen Excel (.xlsx), CSV, PDF veya görsel (.png, .jpg) yükleyin."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (
        msg.toLowerCase().includes("gemini") ||
        msg.toLowerCase().includes("api anahtarı") ||
        msg.toLowerCase().includes("bulunamadı")
      ) {
        setShowApiKeyInput(true);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSaveApiKey(val: string) {
    const cleaned = val.replace(/['"\s]/g, "");
    setGeminiApiKey(cleaned);
    localStorage.setItem("gemini_user_api_key", cleaned);
  }

  function handleItemChange(
    index: number,
    field: keyof ParsedScheduleItem,
    val: unknown
  ) {
    if (!parsedItems) return;
    const copy = [...parsedItems];
    if (field === "day") {
      const dayIndex = DAY_NAMES.indexOf(String(val));
      copy[index] = {
        ...copy[index],
        day: String(val),
        dayOffset: dayIndex >= 0 ? dayIndex : 0,
      };
    } else {
      copy[index] = {
        ...copy[index],
        [field]: val,
      };
    }
    setParsedItems(copy);
  }

  function handleRemoveItem(index: number) {
    if (!parsedItems) return;
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  }

  function handleAddItem() {
    const newItem: ParsedScheduleItem = {
      id: `manual-${Date.now()}`,
      day: "Pazartesi",
      dayOffset: 0,
      time: "16:00",
      durationMinutes: 60,
      subject: "Matematik",
      topic: "",
      targetQuestions: 0,
      note: "",
    };
    setParsedItems([...(parsedItems || []), newItem]);
  }

  async function handleImport() {
    if (!selectedStudentId || !selectedStudent || !profile) {
      setError("Lütfen bir öğrenci seçin.");
      return;
    }
    if (!parsedItems || parsedItems.length === 0) {
      setError("Aktarılacak ders bulunamadı.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const result = await executeScheduleImport({
        studentId: selectedStudentId,
        studentName: selectedStudent.displayName || "Öğrenci",
        teacherId: profile.uid,
        items: parsedItems,
        targetMondayDate: targetMonday,
        importMode,
        defaultPrice,
      });

      let summary = "";
      if (importMode === "LESSONS") {
        summary = `${result.addedLessons} adet canlı ders başarıyla takvime eklendi.`;
      } else if (importMode === "STUDY_PLAN") {
        summary = `${result.addedPlans} adet günlük çalışma görevi programa eklendi.`;
      } else {
        summary = `${result.addedLessons} canlı ders ve ${result.addedPlans} çalışma görevi takvime eklendi.`;
      }

      setImportSuccess(summary);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Dersler aktarılırken hata oluştu: " + msg);
    } finally {
      setImporting(false);
    }
  }

  function resetForm() {
    setFile(null);
    setParsedItems(null);
    setError(null);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Ders Programı İçe Aktar
              </h2>
              <p className="text-xs text-slate-500">
                Excel tablosu, PDF veya ders programı görselini yükleyin, takvime otomatik dağıtılsın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Adım 1: Öğrenci ve Hedef Ayarları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Hedef Öğrenci
              </label>
              <StudentPicker
                students={students}
                value={selectedStudentId}
                onChange={setSelectedStudentId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Program Başlangıç Haftası
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-semibold border transition-all ${
                    weekOffset === 0
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  Bu Hafta
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(1)}
                  className={`flex-1 rounded-xl px-2.5 py-2 text-xs font-semibold border transition-all ${
                    weekOffset === 1
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  Gelecek Hafta
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                📅 {weekLabel}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nereye Dağıtılsın?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode("LESSONS")}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    importMode === "LESSONS"
                      ? "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-200"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                    Canlı Ders Takvimi
                  </span>
                  <span className="text-[11px] opacity-80 mt-0.5">
                    Öğretmenle saatli birebir dersler olarak işlenir
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("STUDY_PLAN")}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    importMode === "STUDY_PLAN"
                      ? "bg-purple-50 border-purple-500 text-purple-900 dark:bg-purple-950/40 dark:border-purple-500 dark:text-purple-200"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400" />
                    Çalışma / Ödev Programı
                  </span>
                  <span className="text-[11px] opacity-80 mt-0.5">
                    Öğrencinin kendi çözeceği günlük konu hedefleri
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode("BOTH")}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    importMode === "BOTH"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-200"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                    Her İkisi Birden
                  </span>
                  <span className="text-[11px] opacity-80 mt-0.5">
                    Hem canlı derslere hem de çalışma planına aktar
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Adım 2: Dosya Yükleme Alanı (Eğer henüz ayrıştırılmış veri yoksa) */}
          {!parsedItems && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                className="hidden"
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = "";
                }}
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              />

              {file && (
                <div className="flex items-center justify-between rounded-xl bg-indigo-50/70 p-3 text-xs dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileText size={18} className="text-indigo-600 shrink-0 dark:text-indigo-400" />
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {(file.size / 1024).toFixed(0)} KB • Hazır
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => handleFileSelected(file)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 shrink-0 shadow-xs text-xs"
                  >
                    {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {analyzing ? "Analiz Ediliyor..." : "Yeniden Analiz Et"}
                  </button>
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 sm:p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  analyzing
                    ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                    : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-slate-700 dark:hover:bg-slate-800/40"
                }`}
              >
                {analyzing ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 size={36} className="animate-spin text-indigo-600" />
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Program Yapay Zeka ile Analiz Ediliyor...
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Dersler, günler, saatler ve hedefler otomatik çıkarılıyor.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2.5 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <UploadCloud size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {file ? "Farklı Bir Dosya Seçin" : "Ders Programı Dosyanızı Sürükleyin veya Seçin"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Excel (.xlsx, .xls, .csv), PDF Belgesi veya Görsel (Fotoğraf/Ekran Görüntüsü)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Alt Araç Çubuğu: Şablon İndir & API Anahtarı */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={downloadSampleScheduleExcel}
                  className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold dark:text-indigo-400"
                >
                  <Download size={14} />
                  Örnek Excel Şablonunu İndir
                </button>

                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                >
                  <Key size={13} />
                  {geminiApiKey ? "Gemini API Anahtarı Ayarlı (Değiştir)" : "Görsel/PDF için API Anahtarı Gir..."}
                </button>
              </div>

              {/* İsteğe Bağlı API Anahtarı Girişi */}
              {showApiKeyInput && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs dark:bg-amber-950/30 dark:border-amber-900/40">
                  <label className="block font-bold text-amber-900 dark:text-amber-200 mb-1">
                    Google Gemini API Anahtarı (Görsel ve PDF Analizi İçin)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      className="flex-1 rounded-lg border border-amber-300 p-2 text-xs outline-none bg-white dark:bg-slate-900 dark:border-amber-800"
                    />
                    <button
                      type="button"
                      disabled={analyzing || !geminiApiKey.trim()}
                      onClick={() => {
                        const cleaned = geminiApiKey.replace(/['"\s]/g, "");
                        handleSaveApiKey(cleaned);
                        if (file) {
                          handleFileSelected(file, cleaned);
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-50 shrink-0 transition-colors shadow-xs text-xs flex items-center gap-1.5"
                    >
                      {analyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {file ? "Kaydet & Analiz Et" : "Kaydet"}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    Google AI Studio üzerinden (aistudio.google.com) ücretsiz API anahtarınızı alabilirsiniz. Tarayıcınızda saklanır.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hata Mesajı */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Ayrıştırma Hatası</p>
                <p className="mt-0.5">{error}</p>
                {file && (
                  <button
                    type="button"
                    disabled={analyzing}
                    onClick={() => handleFileSelected(file)}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Tekrar Dene
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Başarı Mesajı */}
          {importSuccess && (
            <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>{importSuccess}</span>
            </div>
          )}

          {/* Adım 3: Önizleme & Düzenleme Tablosu */}
          {parsedItems && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Bulunan Dersler & Etkinlikler ({parsedItems.length})
                  </span>
                  <p className="text-xs text-slate-500">
                    Aktarmadan önce günleri, saatleri ve konuları düzenleyebilirsiniz.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Plus size={14} /> Yeni Ders Ekle
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-500 hover:text-rose-600 underline"
                  >
                    Farklı Dosya Seç
                  </button>
                </div>
              </div>

              {/* Tablo */}
              <div className="border border-slate-200 rounded-xl overflow-hidden dark:border-slate-800 max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="p-2.5 font-semibold">Gün</th>
                      <th className="p-2.5 font-semibold">Saat</th>
                      <th className="p-2.5 font-semibold">Süre (Dk)</th>
                      <th className="p-2.5 font-semibold">Ders Adı</th>
                      <th className="p-2.5 font-semibold">Konu / Hedef</th>
                      <th className="p-2.5 font-semibold w-16">Soru</th>
                      <th className="p-2.5 font-semibold w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2">
                          <select
                            value={item.day}
                            onChange={(e) => handleItemChange(idx, "day", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs bg-white dark:bg-slate-900 dark:border-slate-700"
                          >
                            {DAY_NAMES.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="time"
                            value={item.time}
                            onChange={(e) => handleItemChange(idx, "time", e.target.value)}
                            className="rounded-lg border border-slate-200 p-1.5 text-xs bg-white dark:bg-slate-900 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.durationMinutes}
                            onChange={(e) =>
                              handleItemChange(idx, "durationMinutes", parseInt(e.target.value, 10) || 60)
                            }
                            className="w-16 rounded-lg border border-slate-200 p-1.5 text-xs bg-white dark:bg-slate-900 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.subject}
                            onChange={(e) => handleItemChange(idx, "subject", e.target.value)}
                            placeholder="Ders"
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs bg-white dark:bg-slate-900 dark:border-slate-700 font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.topic || ""}
                            onChange={(e) => handleItemChange(idx, "topic", e.target.value)}
                            placeholder="Konu / Hedef"
                            className="w-full rounded-lg border border-slate-200 p-1.5 text-xs bg-white dark:bg-slate-900 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.targetQuestions || ""}
                            onChange={(e) =>
                              handleItemChange(idx, "targetQuestions", parseInt(e.target.value, 10) || 0)
                            }
                            placeholder="0"
                            className="w-14 rounded-lg border border-slate-200 p-1.5 text-xs bg-white dark:bg-slate-900 dark:border-slate-700"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 sm:p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
          >
            Kapat
          </button>

          {parsedItems && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || parsedItems.length === 0}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {importing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {importing
                ? "Takvime Aktarılıyor..."
                : `${parsedItems.length} Dersi Takvime & Programa Dağıt`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
