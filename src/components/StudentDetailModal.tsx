"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  GraduationCap,
  MessageCircle,
  Phone,
  School,
  Trash2,
  User,
  UserMinus,
  X,
  AlertCircle,
  Check,
  BookOpen,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { Badge, Card } from "@/components/ui";
import {
  subscribeLessonsForTeacherAndStudent,
  updateLesson,
} from "@/lib/services/lessons";
import { subscribeAllTasksForStudent } from "@/lib/services/tasks";
import { updateStudentSettings } from "@/lib/services/users";
import { refreshParentView } from "@/lib/services/parent";
import {
  LESSON_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  TARGET_GROUP_LABELS,
  type Lesson,
  type PaymentStatus,
  type StudyTask,
  type UserProfile,
} from "@/lib/types";
import { getGradeLabel, getSubjects } from "@/lib/curriculum";

interface StudentDetailModalProps {
  student: UserProfile;
  teacherId: string;
  onClose: () => void;
  onStudentRemoved?: () => void;
}

export default function StudentDetailModal({
  student,
  teacherId,
  onClose,
  onStudentRemoved,
}: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "lessons" | "topics" | "finance">("overview");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [busyRemove, setBusyRemove] = useState(false);
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null);

  useEffect(() => {
    const unsubLessons = subscribeLessonsForTeacherAndStudent(teacherId, student.uid, setLessons);
    const unsubTasks = subscribeAllTasksForStudent(student.uid, setTasks);
    return () => {
      unsubLessons();
      unsubTasks();
    };
  }, [teacherId, student.uid]);

  // Başlangıç tarihi hesaplama
  const startDate = useMemo(() => {
    if (student.createdAt) {
      return student.createdAt.toDate();
    }
    if (lessons.length > 0) {
      return lessons[0].startTime.toDate();
    }
    return null;
  }, [student.createdAt, lessons]);

  const weeksWorkingTogether = useMemo(() => {
    if (!startDate) return null;
    const diffTime = Math.abs(Date.now() - startDate.getTime());
    const diffWeeks = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)));
    return diffWeeks;
  }, [startDate]);

  // Finans hesaplamaları
  const finance = useMemo(() => {
    const completedLessons = lessons.filter((l) => l.status === "COMPLETED");
    const totalHours = (
      completedLessons.reduce((acc, l) => acc + l.durationMinutes, 0) / 60
    ).toFixed(1);

    let totalPaid = 0;
    let totalUnpaid = 0;

    for (const l of completedLessons) {
      const price = l.price || 0;
      if (l.paymentStatus === "PAID") {
        totalPaid += price;
      } else if (l.paymentStatus === "UNPAID") {
        totalUnpaid += price;
      }
    }

    return {
      completedCount: completedLessons.length,
      totalHours,
      totalPaid,
      totalUnpaid,
    };
  }, [lessons]);

  // Çalışılan konular dökümü
  const studiedTopics = useMemo(() => {
    const topicsMap = new Map<string, { count: number; lastDate: Date }>();

    for (const l of lessons) {
      if (l.status === "COMPLETED" && l.subject) {
        const existing = topicsMap.get(l.subject);
        const lDate = l.startTime.toDate();
        if (existing) {
          existing.count += 1;
          if (lDate > existing.lastDate) existing.lastDate = lDate;
        } else {
          topicsMap.set(l.subject, { count: 1, lastDate: lDate });
        }
      }
    }

    return Array.from(topicsMap.entries()).map(([topic, data]) => ({
      topic,
      count: data.count,
      lastDate: data.lastDate,
    }));
  }, [lessons]);

  // Tamamlanan ödevler
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.isCompleted);
  }, [tasks]);

  const totalQuestionsSolved = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.completedQuestions || 0), 0);
  }, [tasks]);

  // Hangi günler ders işlendi? (Tamamlanan ders günleri)
  const completedLessonHistory = useMemo(() => {
    return lessons
      .filter((l) => l.status === "COMPLETED")
      .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
  }, [lessons]);

  // Ödeme durumunu değiştir (PAID <-> UNPAID)
  async function handleTogglePayment(lesson: Lesson) {
    const nextStatus: PaymentStatus = lesson.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    setTogglingPayment(lesson.id);
    try {
      await updateLesson(lesson.id, { paymentStatus: nextStatus });
      refreshParentView(student.uid).catch(() => {});
    } finally {
      setTogglingPayment(null);
    }
  }

  // Öğrenciyi listeden kaldır
  async function handleRemoveStudent() {
    setBusyRemove(true);
    try {
      await updateStudentSettings(student.uid, { teacherId: "" });
      refreshParentView(student.uid).catch(() => {});
      if (onStudentRemoved) onStudentRemoved();
      onClose();
    } catch {
      alert("Öğrenci kaldırılırken bir hata oluştu.");
    } finally {
      setBusyRemove(false);
    }
  }

  // Veliye WhatsApp Hesap Özeti Gönder
  const parentPhoneClean = (student.parentPhone ?? "").replace(/\D/g, "");
  const whatsappReportUrl = useMemo(() => {
    if (!parentPhoneClean) return null;
    const phone = parentPhoneClean.startsWith("90")
      ? parentPhoneClean
      : parentPhoneClean.replace(/^0/, "90");

    const text =
      `Sayın Velimiz, ${student.displayName} için özel ders bilgilendirmesi:\n\n` +
      `📌 Toplam Tamamlanan Ders: ${finance.completedCount} ders (${finance.totalHours} saat)\n` +
      `✅ Tahsil Edilen Tutar: ₺${finance.totalPaid}\n` +
      `⏳ Bekleyen Bakiye: ₺${finance.totalUnpaid}\n\n` +
      `Detaylı ders takibini ve ödevleri veli portalından inceleyebilirsiniz:\n` +
      `${typeof window !== "undefined" ? window.location.origin : ""}/veli/${student.parentToken}`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }, [parentPhoneClean, student.displayName, student.parentToken, finance]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl overflow-hidden dark:bg-[#151f31]">
        {/* Üst Başlık Barı */}
        <div className="flex items-start justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <UserAvatar
              icon={student.avatarIcon}
              role="STUDENT"
              name={student.displayName}
              size="lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {student.displayName}
                </h2>
                {student.grade && (
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {getGradeLabel(student.grade)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{student.email}</p>
              {student.schoolName && (
                <p className="flex items-center gap-1 text-[11px] text-slate-400">
                  <School size={12} /> {student.schoolName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Başlangıç Tarihi & Hızlı İletişim Şeridi */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 text-xs border-b border-slate-100 dark:bg-[#0f1a2c] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Ne Zaman Başladı?
              </p>
              <p className="font-bold text-slate-700 dark:text-slate-200">
                {startDate ? startDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "Kayıtlı Değil"}
                {weeksWorkingTogether && ` (${weeksWorkingTogether}. hafta)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Coins size={16} className="text-emerald-500 shrink-0" />
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">
                Saatlik Ücret
              </p>
              <p className="font-bold text-emerald-600">
                ₺{student.hourlyRate || 0} / saat
              </p>
            </div>
          </div>
        </div>

        {/* Tab Menüsü */}
        <div className="flex border-b border-slate-100 bg-white px-2 pt-2 dark:bg-[#151f31] dark:border-slate-800">
          {(
            [
              ["overview", "Genel"],
              ["lessons", `Dersler (${completedLessonHistory.length})`],
              ["topics", `Konular (${studiedTopics.length})`],
              ["finance", "Ödemeler"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition ${
                activeTab === key
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* İçerik Alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. GENEL BAKIŞ */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Finans Özeti Kartları */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="text-center p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Ders Saati</p>
                  <p className="mt-1 text-lg font-bold text-indigo-600">{finance.totalHours} sa</p>
                  <p className="text-[10px] text-slate-400">{finance.completedCount} tamamlandı</p>
                </Card>
                <Card className="text-center p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Tahsil Edilen</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">₺{finance.totalPaid}</p>
                  <p className="text-[10px] text-emerald-600">Ödendi</p>
                </Card>
                <Card className="text-center p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Bekleyen</p>
                  <p className="mt-1 text-lg font-bold text-rose-600">₺{finance.totalUnpaid}</p>
                  <p className="text-[10px] text-rose-500">Ödeme bekliyor</p>
                </Card>
              </div>

              {/* Veli İletişim & WhatsApp Rapor */}
              <Card className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Veli Bilgileri & WhatsApp
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Veli Adı:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {student.parentName || "Belirtilmemiş"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Veli Telefonu:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {student.parentPhone || "Belirtilmemiş"}
                  </span>
                </div>
                {whatsappReportUrl && (
                  <a
                    href={whatsappReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <MessageCircle size={15} />
                    Veliye Hesap ve Ders Raporu Gönder (WhatsApp)
                  </a>
                )}
              </Card>

              {/* İstatistikler */}
              <Card className="space-y-2 text-xs">
                <p className="font-bold uppercase tracking-wide text-slate-400">
                  Ödev & Soru İlerlemesi
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-500">Çözülen Toplam Soru:</span>
                  <span className="font-bold text-indigo-600">{totalQuestionsSolved} soru</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tamamlanan Görev / Ödev:</span>
                  <span className="font-semibold">{completedTasks.length} / {tasks.length}</span>
                </div>
              </Card>

              {/* Tehlikeli Bölge: Öğrenci Kaldır */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/30"
                >
                  <UserMinus size={15} />
                  Öğrenciyi Öğretmen Listemden Çıkar
                </button>
              </div>
            </div>
          )}

          {/* 2. DERSLER & HANGİ GÜNLER DERS İŞLENDİ */}
          {activeTab === "lessons" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Bu öğrenciyle tamamlanan ve onaylanan ders günleri:
              </p>
              {completedLessonHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                  Henüz tamamlanmış bir ders bulunmuyor.
                </div>
              ) : (
                completedLessonHistory.map((lesson) => (
                  <Card key={lesson.id} className="space-y-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {lesson.subject}
                        </p>
                        <p className="text-xs text-slate-500">
                          {lesson.startTime.toDate().toLocaleDateString("tr-TR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-indigo-600 font-medium">
                          Saat: {lesson.startTime.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} • {lesson.durationMinutes} dakika
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone="green">Tamamlandı</Badge>
                        <button
                          type="button"
                          onClick={() => handleTogglePayment(lesson)}
                          disabled={togglingPayment === lesson.id}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                            lesson.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                          }`}
                        >
                          {lesson.paymentStatus === "PAID" ? "✓ Ödendi" : "⏳ Ödeme Bekliyor"}
                        </button>
                      </div>
                    </div>
                    {lesson.parentNote && (
                      <p className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <span className="font-semibold">Derste Yapılanlar: </span>
                        {lesson.parentNote}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* 3. HANGİ KONULARA ÇALIŞTIK */}
          {activeTab === "topics" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                  Derslerde İşlenen Konular
                </h3>
                {studiedTopics.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Henüz tamamlanan ders konusu kaydedilmedi.</p>
                ) : (
                  <div className="space-y-1.5">
                    {studiedTopics.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {t.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {t.count} ders
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {t.lastDate.toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                  Tamamlanan Ödevler & Görevler
                </h3>
                {completedTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Tamamlanan ödev bulunmuyor.</p>
                ) : (
                  <div className="space-y-1.5">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-100 p-2.5 text-xs dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                          <span className="font-bold text-emerald-600">
                            {task.completedQuestions} / {task.targetQuestions} soru
                          </span>
                        </div>
                        {task.subject && (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {task.subject} {task.topic ? `• ${task.topic}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. ÖDEMELER VE DÖKÜM */}
          {activeTab === "finance" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Tahsil Edilen (Ödenen)</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    ₺{finance.totalPaid}
                  </p>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3 dark:bg-rose-950/40">
                  <p className="text-xs text-rose-700 dark:text-rose-300">Bekleyen Bakiye</p>
                  <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
                    ₺{finance.totalUnpaid}
                  </p>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
                Ders Bazlı Ödeme Takibi (Durumu değiştirmek için butona tıklayın):
              </p>

              {lessons.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Ders kaydı bulunamadı.</p>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 text-xs dark:border-slate-800"
                    >
                      <div>
                        <p className="font-semibold">{lesson.subject}</p>
                        <p className="text-[10px] text-slate-400">
                          {lesson.startTime.toDate().toLocaleDateString("tr-TR")} • ₺{lesson.price || 0}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePayment(lesson)}
                        disabled={togglingPayment === lesson.id}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition ${
                          lesson.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                        }`}
                      >
                        {togglingPayment === lesson.id ? (
                          "Kaydediliyor..."
                        ) : lesson.paymentStatus === "PAID" ? (
                          <>
                            <Check size={13} /> Ödendi
                          </>
                        ) : (
                          <>
                            <Clock size={13} /> Bekliyor
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Öğrenci Kaldırma Onay Modalı */}
        {showRemoveConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#151f31]">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle size={22} />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Öğrenciyi Kaldır
                </h3>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                <strong>{student.displayName}</strong> adlı öğrenciyi listenizden kaldırmak istediğinize emin misiniz?
                Öğrencinin geçmiş verileri korunacak ancak aktif öğretmen listenizden ayrılacaktır.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleRemoveStudent}
                  disabled={busyRemove}
                  className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  {busyRemove ? "Kaldırılıyor..." : "Evet, Kaldır"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
