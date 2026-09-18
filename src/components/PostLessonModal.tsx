"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  Share2,
  X,
} from "lucide-react";
import { addMaterial } from "@/lib/services/materials";
import { addTask } from "@/lib/services/tasks";
import { updateLesson } from "@/lib/services/lessons";
import { refreshParentView } from "@/lib/services/parent";
import { getSubjects, getTopics } from "@/lib/curriculum";
import { formatTime, weekKey } from "@/lib/utils";
import { createNotification } from "@/lib/services/notifications";
import type { Lesson, PaymentStatus, UserProfile } from "@/lib/types";

interface Props {
  lesson: Lesson | null;
  student?: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function PostLessonModal({
  lesson,
  student,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 1. Derste Yapılanlar
  const [materialTitle, setMaterialTitle] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // 2. Ödevlendirme
  const [giveHomework, setGiveHomework] = useState(true);
  const [hwSubject, setHwSubject] = useState("");
  const [hwTopic, setHwTopic] = useState("");
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwTarget, setHwTarget] = useState("30");
  const [hwDueDate, setHwDueDate] = useState("");
  const [hwDriveLink, setHwDriveLink] = useState("");

  // 3. Ücret & Tahsilat
  const [price, setPrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");

  // 4. Veli Notu
  const [parentNote, setParentNote] = useState("");

  // Ders bilgileri yüklendiğinde varsayılanları doldur
  useEffect(() => {
    if (!lesson) return;
    setMaterialTitle(`${lesson.subject} - Ders Özeti`);
    setLessonSummary("");
    setDriveLink("");
    setFiles([]);
    setPrice(lesson.price ? String(lesson.price) : "");
    setPaymentStatus(lesson.paymentStatus || "UNPAID");
    setParentNote(lesson.parentNote || "");

    // Ödev varsayılanları
    setGiveHomework(true);
    setHwSubject(lesson.subject.split(" ")[0] || "");
    setHwTopic("");
    setHwTitle(`${lesson.subject} Ödevi`);
    setHwDesc("");
    setHwTarget("30");
    // Varsayılan teslim tarihi: 3 gün sonra
    const d = new Date();
    d.setDate(d.getDate() + 3);
    setHwDueDate(d.toISOString().slice(0, 10));
    setHwDriveLink("");
    setErr("");
  }, [lesson]);

  const availableSubjects = useMemo(() => {
    if (!student) return [];
    if (student.enrolledSubjects && student.enrolledSubjects.length > 0) {
      return student.enrolledSubjects;
    }
    return getSubjects(student.grade, student.targetGroup);
  }, [student]);

  const availableTopics = useMemo(() => {
    if (!student || !hwSubject) return [];
    return getTopics(hwSubject, student.grade, student.targetGroup);
  }, [student, hwSubject]);

  if (!isOpen || !lesson) return null;

  async function handleCompleteLesson() {
    if (!lesson) return;
    setBusy(true);
    setErr("");
    try {
      // 1. Dersi tamamlandı olarak güncelle, ücret & tahsilat durumunu kaydet
      const parsedPrice = parseInt(price, 10);
      await updateLesson(lesson.id, {
        status: "COMPLETED",
        paymentStatus,
        price: isNaN(parsedPrice) ? lesson.price : parsedPrice,
        parentNote: parentNote.trim() || undefined,
      });

      // 2. Eğer derste yapılanlar veya materyal girildiyse kaydet
      if (lessonSummary.trim() || driveLink.trim() || files.length > 0) {
        await addMaterial({
          teacherId: lesson.teacherId,
          studentId: lesson.studentId,
          lessonId: lesson.id,
          title: materialTitle.trim() || `${lesson.subject} - Ders Özeti`,
          description: lessonSummary.trim(),
          driveLink: driveLink.trim() || undefined,
          files,
        });
      }

      // 3. Eğer ödev seçildiyse ödevi kaydet
      if (giveHomework && hwTitle.trim()) {
        const targetQ = parseInt(hwTarget, 10) || 0;
        const due = hwDueDate ? new Date(hwDueDate) : null;
        await addTask({
          teacherId: lesson.teacherId,
          studentId: lesson.studentId,
          week: weekKey(),
          title: hwTitle.trim(),
          subject: hwSubject || undefined,
          topic: hwTopic || undefined,
          description: hwDesc.trim() || undefined,
          driveLink: hwDriveLink.trim() || undefined,
          targetQuestions: targetQ,
          dueDate: due,
        });

        createNotification({
          recipientId: lesson.studentId,
          senderId: lesson.teacherId,
          title: "Yeni Ödev Verildi 📚",
          body: `${lesson.subject}: ${hwTitle.trim()} (${targetQ} Soru Hedefi)`,
          link: "/panel",
        }).catch(() => {});
      } else if (lessonSummary.trim() || driveLink.trim() || files.length > 0) {
        createNotification({
          recipientId: lesson.studentId,
          senderId: lesson.teacherId,
          title: "Ders İçeriği & Materyal Eklendi 📄",
          body: `${lesson.subject}: Derste yapılanlar ve ders materyalleri eklendi.`,
          link: "/panel/takvim",
        }).catch(() => {});
      }

      // 4. Veli portalı özetini anında güncelle
      await refreshParentView(lesson.studentId).catch(() => {});

      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ders tamamlanırken hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  // Veliye WhatsApp üzerinden hazır şablon gönderme
  function handleSendWhatsApp() {
    if (!student?.parentPhone && !student?.studentPhone) return;
    const phone = (student.parentPhone || student.studentPhone || "").replace(/\D/g, "");
    if (!phone) return;

    let text = `Sayın Velimiz, bugün ${student.displayName} ile ${lesson?.subject} özel dersimizi tamamladık.\n`;
    if (lessonSummary.trim()) {
      text += `\n📌 Derste Yapılanlar: ${lessonSummary.trim()}`;
    }
    if (giveHomework && hwTitle.trim()) {
      text += `\n📚 Verilen Ödev: ${hwTitle.trim()}`;
      if (hwDesc.trim()) text += ` (${hwDesc.trim()})`;
      if (hwTarget) text += ` - Hedef: ${hwTarget} soru`;
      if (hwDueDate) text += ` - Son Teslim: ${new Date(hwDueDate).toLocaleDateString("tr-TR")}`;
    }
    if (parentNote.trim()) {
      text += `\n💬 Öğretmen Notu: ${parentNote.trim()}`;
    }
    if (student.parentToken) {
      const parentUrl = `${window.location.origin}/veli/${student.parentToken}`;
      text += `\n\n🔍 Detaylı gelişim ve ders raporu için: ${parentUrl}`;
    }

    const encoded = encodeURIComponent(text);
    const targetPhone = phone.startsWith("90") ? phone : `90${phone}`;
    window.open(`https://wa.me/${targetPhone}?text=${encoded}`, "_blank");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden dark:bg-[#151f31] dark:border dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs dark:bg-indigo-900/40 dark:text-indigo-300">
                ✓
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ders Sonu Ekranı & Değerlendirme
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lesson.studentName}
              </span>{" "}
              • {lesson.subject} • {formatTime(lesson.startTime.toDate())} ({lesson.durationMinutes} dk)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* İçerik Alanı (Kaydırılabilir) */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {err && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              {err}
            </div>
          )}

          {/* 1. BÖLÜM: Derste Yapılanlar & Notlar */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Derste Yapılanlar & İşlenen Konu
              </h3>
            </div>

            <input
              type="text"
              placeholder="Konu başlığı (örn. Analitik Geometri - Noktanın Analitiği)"
              value={materialTitle}
              onChange={(e) => setMaterialTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            />

            <textarea
              rows={3}
              placeholder="Derste neler yapıldı? (İşlenen konular, kavranan formüller, çözülen soru tipleri, dikkat edilmesi gerekenler...)"
              value={lessonSummary}
              onChange={(e) => setLessonSummary(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            />

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <LinkIcon size={14} />
              </div>
              <input
                type="url"
                placeholder="Google Drive / Doküman Linki (https://drive.google.com/...)"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500">
                Ders Notu / PDF veya Görsel Yükle (İsteğe bağlı)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                className="mt-1 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
              />
            </div>
          </div>

          {/* 2. BÖLÜM: Ders Sonu Ödevlendirme */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  2
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Ders Sonu Ödevi Tanımla
                </h3>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <input
                  type="checkbox"
                  checked={giveHomework}
                  onChange={(e) => setGiveHomework(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                Ödev Ver
              </label>
            </div>

            {giveHomework && (
              <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Ders</label>
                    <select
                      value={hwSubject}
                      onChange={(e) => {
                        const s = e.target.value;
                        setHwSubject(s);
                        setHwTopic("");
                        if (s) setHwTitle(`${s} Ödevi`);
                      }}
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                    >
                      <option value="">Ders seçin</option>
                      {availableSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Müfredat Konusu</label>
                    <select
                      value={hwTopic}
                      onChange={(e) => {
                        const t = e.target.value;
                        setHwTopic(t);
                        if (hwSubject && t) setHwTitle(`${hwSubject} - ${t}`);
                      }}
                      disabled={!hwSubject}
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c] disabled:opacity-50"
                    >
                      <option value="">Konu seçin</option>
                      {availableTopics.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Ödev başlığı (örn. Matematik - Test 1 ve 2)"
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                />

                <textarea
                  rows={2}
                  placeholder="Ödev detayları & yönergeler (örn. Kitap sayfa 40-52 arası çözülecek, yapamadıkların soru kumbarasına yüklenecek)"
                  value={hwDesc}
                  onChange={(e) => setHwDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Hedef Soru</label>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Örn. 30"
                      value={hwTarget}
                      onChange={(e) => setHwTarget(e.target.value)}
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Son Teslim Tarihi</label>
                    <input
                      type="date"
                      value={hwDueDate}
                      onChange={(e) => setHwDueDate(e.target.value)}
                      className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <LinkIcon size={13} />
                  </div>
                  <input
                    type="url"
                    placeholder="Ödev Drive / Doküman Linki (isteğe bağlı)"
                    value={hwDriveLink}
                    onChange={(e) => setHwDriveLink(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. BÖLÜM: Ders Ücreti & Tahsilat */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                3
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Ders Ücreti & Tahsilat
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-500">Ders Ücreti (₺)</label>
                <div className="relative mt-0.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-slate-400">
                    ₺
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500">Ödeme Durumu</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
                >
                  <option value="PAID">✓ Ödendi (Nakit/Havale)</option>
                  <option value="UNPAID">⏳ Ödeme Bekliyor</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. BÖLÜM: Veli Notu & WhatsApp Paylaşımı */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  4
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Veli Bilgilendirme Notu
                </h3>
              </div>

              {(student?.parentPhone || student?.studentPhone) && (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <MessageCircle size={13} /> WhatsApp ile Gönder
                </button>
              )}
            </div>

            <textarea
              rows={2}
              placeholder="Veli portalında veliye görünecek ders sonu değerlendirme notu..."
              value={parentNote}
              onChange={(e) => setParentNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            />
          </div>
        </div>

        {/* Alt Butonlar */}
        <div className="border-t border-slate-100 pt-3 flex gap-2 shrink-0 dark:border-slate-800">
          <button
            onClick={handleCompleteLesson}
            disabled={busy}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Kaydediliyor...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Dersi Tamamla & Veliye Yansıt
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0f1a2c] dark:text-slate-300"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
}
