"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Link as LinkIcon,
  ListFilter,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  X,
  CalendarDays,
  Clock,
  Sparkles,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Card } from "@/components/ui";
import UserAvatar from "@/components/UserAvatar";
import StudentPicker from "@/components/StudentPicker";
import PostLessonModal from "@/components/PostLessonModal";
import ScheduleImportModal from "@/components/ScheduleImportModal";
import {
  addLesson,
  subscribeLessonsForStudent,
  subscribeLessonsForTeacher,
  updateLesson,
} from "@/lib/services/lessons";
import { subscribeStudents } from "@/lib/services/users";
import { subscribePlans } from "@/lib/services/plans";
import { createNotification } from "@/lib/services/notifications";
import { refreshParentView } from "@/lib/services/parent";
import {
  addMaterial,
  deleteMaterial,
  subscribeMaterialsForLesson,
} from "@/lib/services/materials";
import {
  LESSON_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type Lesson,
  type LessonMaterial,
  type PaymentStatus,
  type PlanItem,
  type UserProfile,
} from "@/lib/types";
import { getSubjects, getTopics } from "@/lib/curriculum";
import {
  addDays,
  dateKey,
  formatTime,
  isSameDay,
  mondayOf,
} from "@/lib/utils";

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/* ------------------------- Ders İçerikleri ------------------------- */

function LessonMaterials({
  lesson,
  isTeacher,
  teacherId,
}: {
  lesson: Lesson;
  isTeacher: boolean;
  teacherId: string;
}) {
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [viewing, setViewing] = useState<LessonMaterial | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeMaterialsForLesson(lesson.id, setMaterials);
  }, [lesson.id]);

  async function handleSave() {
    if (!title.trim() && !desc.trim() && !driveLink.trim() && files.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      await addMaterial({
        teacherId,
        studentId: lesson.studentId,
        lessonId: lesson.id,
        title: title.trim() || "Ders Özeti & Materyal",
        description: desc.trim(),
        driveLink: driveLink.trim() || undefined,
        files,
      });
      refreshParentView(lesson.studentId).catch(() => {});
      setTitle("");
      setDesc("");
      setDriveLink("");
      setFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      setShowForm(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  const formatExternalUrl = (url: string) => {
    if (!url) return "";
    return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Ders İçerikleri & Yapılanlar ({materials.length})
        </p>
      </div>

      <div className="space-y-2">
        {materials.map((m) => (
          <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-all hover:border-slate-200">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800">{m.title}</p>
                {m.description && (
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">
                    {m.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {m.driveLink && (
                    <a
                      href={formatExternalUrl(m.driveLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <ExternalLink size={12} /> Google Drive Linki
                    </a>
                  )}

                  {m.files.length > 0 && (
                    <button
                      onClick={() => setViewing(m)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <Paperclip size={12} /> {m.files.length} Dosya (Görüntüle / İndir)
                    </button>
                  )}
                </div>

                {/* Hızlı İndirme Butonları */}
                {m.files.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-slate-200/60 pt-1.5">
                    {m.files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="truncate max-w-[200px] flex items-center gap-1">
                          {f.kind === "pdf" ? <FileText size={12} className="text-rose-500" /> : <ImageIcon size={12} className="text-indigo-500" />}
                          {f.name}
                        </span>
                        <a
                          href={f.dataUrl}
                          download={f.name}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <Download size={11} /> İndir
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isTeacher && (
                <button
                  onClick={async () => {
                    await deleteMaterial(m.id);
                    refreshParentView(lesson.studentId).catch(() => {});
                  }}
                  className="p-1 text-slate-300 hover:text-rose-500"
                  aria-label="İçeriği sil"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        {materials.length === 0 && (
          <p className="text-xs text-slate-400 italic">Henüz derste yapılanlar veya materyal eklenmemiş.</p>
        )}
      </div>

      {isTeacher && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <Plus size={14} /> Yapılanlar & Materyal Ekle
        </button>
      )}

      {isTeacher && showForm && (
        <div className="mt-2.5 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
          <input
            type="text"
            placeholder="Başlık (örn. 1. Dereceden Denklemler & Ödevler)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400"
          />
          <textarea
            rows={3}
            placeholder="Derste neler yapıldı? (İşlenen konular, çözülen örnekler, dersteki notlar ve ödev yönergeleri...)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400">
              <LinkIcon size={13} />
            </div>
            <input
              type="url"
              placeholder="Google Drive / Dosya Linki (https://drive.google.com/...)"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2.5 py-1.5 text-xs outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500">PDF veya Görsel Yükle (İsteğe bağlı)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
              className="mt-1 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-700"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Görseller otomatik sıkıştırılır, PDF ~700KB. Büyük dosyalar için Google Drive linkini kullanabilirsiniz.
            </p>
          </div>
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-indigo-700"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              Kaydet ve Veliye Yansıt
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* İçerik ve Dosya Görüntüleme / İndirme Modalı */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 flex items-center justify-center"
          onClick={() => setViewing(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">{viewing.title}</h3>
                <p className="text-xs text-slate-400">
                  {lesson.subject} • {lesson.startTime.toDate().toLocaleDateString("tr-TR")}
                </p>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {viewing.description && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Derste Yapılanlar</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                  {viewing.description}
                </p>
              </div>
            )}

            {viewing.driveLink && (
              <div className="mt-3">
                <a
                  href={formatExternalUrl(viewing.driveLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink size={16} className="text-emerald-600" />
                    Google Drive / Harici Dokümanı Aç
                  </span>
                  <span className="text-[10px] text-emerald-600 underline">Sekmede Aç ↗</span>
                </a>
              </div>
            )}

            <div className="mt-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">
                Ekli Dosyalar ({viewing.files.length})
              </p>
              <div className="space-y-3">
                {viewing.files.map((f, i) =>
                  f.kind === "image" ? (
                    <div key={i} className="rounded-xl border border-slate-200 p-2 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.dataUrl}
                        alt={f.name}
                        className="w-full max-h-80 object-contain rounded-lg bg-black/5"
                      />
                      <div className="mt-2 flex items-center justify-between px-1">
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[250px]">{f.name}</span>
                        <a
                          href={f.dataUrl}
                          download={f.name}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                          <Download size={13} /> İndir
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800"
                    >
                      <span className="flex items-center gap-2 truncate max-w-[250px]">
                        <FileText size={18} className="text-rose-500 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <a
                        href={f.dataUrl}
                        download={f.name}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors shrink-0"
                      >
                        <Download size={13} /> PDF İndir
                      </a>
                    </div>
                  )
                )}
                {viewing.files.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Dosya eklenmemiş.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusTone(status: Lesson["status"]) {
  switch (status) {
    case "PENDING":
      return "amber" as const;
    case "CONFIRMED":
      return "indigo" as const;
    case "COMPLETED":
      return "green" as const;
    case "CANCELLED":
      return "red" as const;
  }
}

function paymentTone(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "green" as const;
    case "UNPAID":
      return "red" as const;
    case "PACKAGE":
      return "slate" as const;
  }
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [proposeFor, setProposeFor] = useState<string | null>(null);
  const [proposeValue, setProposeValue] = useState("");
  const [postLessonFor, setPostLessonFor] = useState<Lesson | null>(null);

  // form state
  const [formStudent, setFormStudent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formPayment, setFormPayment] = useState<PaymentStatus>("UNPAID");

  const selectedStudentProfile = useMemo(
    () => students.find((s) => s.uid === formStudent),
    [students, formStudent]
  );

  const studentLessonSubjects = useMemo(() => {
    if (!selectedStudentProfile) return [];
    if (
      selectedStudentProfile.enrolledSubjects &&
      selectedStudentProfile.enrolledSubjects.length > 0
    ) {
      return selectedStudentProfile.enrolledSubjects;
    }
    return getSubjects(
      selectedStudentProfile.grade,
      selectedStudentProfile.targetGroup
    );
  }, [selectedStudentProfile]);

  const lessonTopics = useMemo(() => {
    if (!selectedStudentProfile || !formSubject) return [];
    return getTopics(
      formSubject,
      selectedStudentProfile.grade,
      selectedStudentProfile.targetGroup
    );
  }, [selectedStudentProfile, formSubject]);

  function handleStudentSelect(studentId: string) {
    setFormStudent(studentId);
    const s = students.find((x) => x.uid === studentId);
    if (s) {
      if (s.hourlyRate) {
        setFormPrice(String(s.hourlyRate));
      }
      const subs =
        s.enrolledSubjects && s.enrolledSubjects.length > 0
          ? s.enrolledSubjects
          : getSubjects(s.grade, s.targetGroup);
      if (subs[0]) {
        setFormSubject(subs[0]);
        setFormTopic("");
        setCustomTopic("");
      }
    }
  }

  const isTeacher = profile?.role === "TEACHER";
  const [plans, setPlans] = useState<PlanItem[]>([]);

  useEffect(() => {
    if (!profile) return;
    if (isTeacher) {
      const u1 = subscribeLessonsForTeacher(profile.uid, setLessons);
      const u2 = subscribeStudents(profile.uid, setStudents);
      return () => {
        u1();
        u2();
      };
    }
    return subscribeLessonsForStudent(profile.uid, setLessons);
  }, [profile, isTeacher]);

  useEffect(() => {
    if (!profile) return;
    if (isTeacher) {
      if (selectedStudent) {
        return subscribePlans(selectedStudent, setPlans);
      }
      setPlans([]);
      return;
    }
    return subscribePlans(profile.uid, setPlans);
  }, [profile, isTeacher, selectedStudent]);

  const [calendarView, setCalendarView] = useState<"flow" | "schedule">("flow");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "COMPLETED" | "PENDING">("ALL");
  const [showImportModal, setShowImportModal] = useState(false);

  const visibleLessons = useMemo(() => {
    let list = lessons;
    if (isTeacher && selectedStudent) {
      list = list.filter((l) => l.studentId === selectedStudent);
    }
    if (statusFilter !== "ALL") {
      list = list.filter((l) => l.status === statusFilter);
    }
    return list;
  }, [lessons, isTeacher, selectedStudent, statusFilter]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Bu haftanın dersleri ve istatistikleri
  const weekLessons = useMemo(() => {
    const endOfWeek = addDays(weekStart, 7);
    return visibleLessons.filter((l) => {
      const d = l.startTime.toDate();
      return d >= weekStart && d < endOfWeek;
    });
  }, [visibleLessons, weekStart]);

  const weekStats = useMemo(() => {
    const totalMinutes = weekLessons.reduce((sum, l) => sum + l.durationMinutes, 0);
    const totalPrice = weekLessons.reduce((sum, l) => sum + (l.price || 0), 0);
    return {
      count: weekLessons.length,
      hours: (totalMinutes / 60).toFixed(1),
      price: totalPrice,
    };
  }, [weekLessons]);

  if (!profile) return null;

  async function afterMutation(studentId: string) {
    // Veli özetini arka planda güncelle
    refreshParentView(studentId).catch(() => {});
  }

  async function handleAddLesson() {
    const student = students.find((s) => s.uid === formStudent);
    if (!student || !formDate || !formSubject.trim()) return;

    // Ders çakışması kontrolü
    const newStartMs = new Date(formDate).getTime();
    const newEndMs = newStartMs + (parseInt(formDuration, 10) || 60) * 60 * 1000;
    const conflict = lessons.find((l) => {
      if (l.status === "CANCELLED") return false;
      const existStart = l.startTime.toDate().getTime();
      const existEnd = existStart + l.durationMinutes * 60 * 1000;
      return newStartMs < existEnd && newEndMs > existStart;
    });

    if (conflict) {
      const conflictStudent = conflict.studentName || "bir öğrenci";
      const conflictTime = formatTime(conflict.startTime.toDate());
      const proceed = confirm(
        `⚠️ DİKKAT (Ders Çakışması): ${conflictTime} saatinde zaten ${conflictStudent} ile bir dersiniz bulunuyor. Yine de bu saate yeni ders kaydetmek istiyor musunuz?`
      );
      if (!proceed) return;
    }

    const finalTopic =
      formTopic === "__CUSTOM__" ? customTopic.trim() : formTopic.trim();
    const finalSubjectName = finalTopic
      ? `${formSubject.trim()} (${finalTopic})`
      : formSubject.trim();

    await addLesson({
      teacherId: profile!.uid,
      studentId: student.uid,
      studentName: student.displayName,
      startTime: new Date(formDate),
      durationMinutes: parseInt(formDuration, 10) || 60,
      subject: finalSubjectName,
      price: parseInt(formPrice, 10) || 0,
      paymentStatus: formPayment,
    });

    createNotification({
      recipientId: student.uid,
      senderId: profile!.uid,
      senderName: profile!.displayName || "Öğretmen",
      title: "Yeni Ders Planlandı 📅",
      body: `${finalSubjectName} - ${new Date(formDate).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`,
      link: "/panel/takvim",
    }).catch(() => {});

    await afterMutation(student.uid);
    setShowForm(false);
    setFormDate("");
    setFormSubject("");
    setFormTopic("");
    setCustomTopic("");
    setFormPrice("");
  }

  async function handleStatus(lesson: Lesson, status: Lesson["status"]) {
    await updateLesson(lesson.id, { status });
    await afterMutation(lesson.studentId);
  }

  async function handlePayment(lesson: Lesson, paymentStatus: PaymentStatus) {
    await updateLesson(lesson.id, { paymentStatus });
    await afterMutation(lesson.studentId);
  }

  async function handleSaveNote(lesson: Lesson) {
    await updateLesson(lesson.id, { parentNote: noteText });
    await afterMutation(lesson.studentId);
    setNoteFor(null);
    setNoteText("");
  }

  async function handlePropose(lesson: Lesson) {
    if (!proposeValue) return;
    await updateLesson(lesson.id, {
      proposedTime: Timestamp.fromDate(new Date(proposeValue)),
    });

    createNotification({
      recipientId: lesson.teacherId,
      senderId: profile!.uid,
      senderName: profile!.displayName || "Öğrenci",
      title: "Ders Saati Teklifi ⏰",
      body: `${profile!.displayName || "Öğrenciniz"} ${lesson.subject} dersi için yeni saat teklif etti.`,
      link: "/panel/takvim",
    }).catch(() => {});

    setProposeFor(null);
    setProposeValue("");
  }

  async function handleAcceptProposal(lesson: Lesson) {
    if (!lesson.proposedTime) return;
    await updateLesson(lesson.id, {
      startTime: lesson.proposedTime,
      proposedTime: null,
      status: "CONFIRMED",
    });

    createNotification({
      recipientId: lesson.studentId,
      senderId: profile!.uid,
      senderName: profile!.displayName || "Öğretmen",
      title: "Ders Saati Teklifi Kabul Edildi ✅",
      body: `${lesson.subject} ders saati teklifiniz onaylandı.`,
      link: "/panel/takvim",
    }).catch(() => {});

    await afterMutation(lesson.studentId);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Ders Takvimi</h1>
          <p className="text-xs text-slate-500">
            {isTeacher ? "Haftalık ders planı ve öğretmen ajandası" : "Dersleriniz ve çalışma takviminiz"}
          </p>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors shadow-xs"
            >
              <Sparkles size={14} /> Program İçe Aktar
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Plus size={15} /> Ders Ekle
            </button>
          </div>
        )}
      </div>

      {isTeacher && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50/80 px-3.5 py-2 text-xs font-semibold text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-200">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-indigo-600 dark:text-indigo-400" />
            Bu Hafta: <strong>{weekStats.count} ders</strong> ({weekStats.hours} saat)
          </span>
          {weekStats.price > 0 && (
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">
              ₺{weekStats.price} planlandı
            </span>
          )}
        </div>
      )}

      {/* Görünüm Seçici (Akış vs Çizelge) */}
      <div className="mt-3.5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-[#1e2a40]">
        <button
          type="button"
          onClick={() => setCalendarView("flow")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
            calendarView === "flow"
              ? "bg-white text-indigo-600 shadow-xs dark:bg-[#0f1a2c] dark:text-indigo-400"
              : "text-slate-500"
          }`}
        >
          <CalendarDays size={14} /> Haftalık Akış
        </button>
        <button
          type="button"
          onClick={() => setCalendarView("schedule")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
            calendarView === "schedule"
              ? "bg-white text-indigo-600 shadow-xs dark:bg-[#0f1a2c] dark:text-indigo-400"
              : "text-slate-500"
          }`}
        >
          <LayoutGrid size={14} /> Ders Çizelgesi (Gün & Saat & Öğrenci)
        </button>
      </div>

      {isTeacher && (
        <div className="mt-3">
          <StudentPicker
            students={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
          />
        </div>
      )}

      {/* Durum Filtreleme Çipleri */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 text-[11px] font-medium shrink-0 flex items-center gap-1">
          <ListFilter size={12} /> Durum:
        </span>
        {(
          [
            ["ALL", "Tümü"],
            ["CONFIRMED", "Onaylı"],
            ["COMPLETED", "Tamamlandı"],
            ["PENDING", "Bekleyen"],
          ] as const
        ).map(([val, lbl]) => (
          <button
            key={val}
            type="button"
            onClick={() => setStatusFilter(val)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
              statusFilter === val
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {isTeacher && showForm && (
        <Card className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-slate-500">
            Öğrenci
            <select
              value={formStudent}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Öğrenci seçin</option>
              {students.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.displayName} {s.grade ? `(${s.grade}. Sınıf)` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-500">
            Tarih ve Saat
            <input
              type="datetime-local"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-slate-500">
              Süre (dakika)
              <input
                type="number"
                min={15}
                step={15}
                placeholder="60"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Ders Ücreti (₺)
              <input
                type="number"
                min={0}
                placeholder="0"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </label>
          </div>

          {/* Ders Seçimi */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-500">
              Ders
              {studentLessonSubjects.length > 0 ? (
                <select
                  value={formSubject}
                  onChange={(e) => {
                    setFormSubject(e.target.value);
                    setFormTopic("");
                    setCustomTopic("");
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  {studentLessonSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                  <option value="__CUSTOM_SUBJ__">✏️ Diğer Ders Adı...</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ders adı (örn. Matematik)"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              )}
            </label>

            {/* Konu Seçimi */}
            <label className="text-xs font-medium text-slate-500">
              İşlenecek Konu (Opsiyonel)
              {lessonTopics.length > 0 ? (
                <select
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                >
                  <option value="">Konu belirtilmedi</option>
                  {lessonTopics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__CUSTOM__">✏️ Özel Konu Yaz...</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="İşlenecek konu"
                  value={formTopic === "__CUSTOM__" ? customTopic : formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
              )}
            </label>
          </div>

          {formTopic === "__CUSTOM__" && (
            <input
              type="text"
              placeholder="Özel işlenecek konu başlığı girin..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full rounded-xl border border-indigo-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
            />
          )}

          <label className="block text-xs font-medium text-slate-500">
            Ödeme Durumu
            <select
              value={formPayment}
              onChange={(e) => setFormPayment(e.target.value as PaymentStatus)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="UNPAID">Ödeme Bekliyor</option>
              <option value="PAID">Ödendi</option>
            </select>
          </label>

          <button
            onClick={handleAddLesson}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Dersi Kaydet
          </button>
        </Card>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Önceki hafta"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold">
          {weekStart.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
          {" — "}
          {addDays(weekStart, 6).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
          })}
        </p>
        <button
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Sonraki hafta"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {calendarView === "schedule" ? (
        <div className="mt-3 space-y-3">
          {days.map((day, i) => {
            const dayLessons = visibleLessons
              .filter((l) => isSameDay(l.startTime.toDate(), day))
              .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
            const dayPlans = plans.filter((p) => p.periodKey === dateKey(day));
            const isToday = dateKey(day) === dateKey();

            return (
              <div
                key={day.toISOString()}
                className={`rounded-2xl border bg-white p-3.5 shadow-xs transition-all dark:bg-[#151f31] ${
                  isToday
                    ? "border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-800 dark:ring-indigo-950/50"
                    : "border-slate-100 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold ${
                        isToday
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {DAY_NAMES[i]}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        {day.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                        {isToday && (
                          <span className="ml-1.5 text-xs text-indigo-600 font-semibold">(Bugün)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dayPlans.length > 0 && (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {dayPlans.length} Görev
                      </span>
                    )}
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        dayLessons.length > 0
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          : "text-slate-400"
                      }`}
                    >
                      {dayLessons.length > 0 ? `${dayLessons.length} Ders` : "Ders Yok"}
                    </span>
                  </div>
                </div>

                {dayLessons.length === 0 && dayPlans.length === 0 ? (
                  <p className="py-2.5 text-center text-xs text-slate-300 dark:text-slate-600 italic">
                    Bu gün için planlanmış ders veya görev yok.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-2">
                    {/* Günün Çalışma Programı / Ödevleri */}
                    {dayPlans.length > 0 && (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1.5">
                          <span>🎯</span> Günün Çalışma Programı ({dayPlans.length})
                        </p>
                        <div className="space-y-1.5">
                          {dayPlans.map((dp) => (
                            <div
                              key={dp.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white/90 p-2 text-xs dark:bg-[#151f31]/90 shadow-2xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {dp.title}
                                </p>
                                {dp.targetQuestions > 0 && (
                                  <p className="text-[10px] text-slate-500">
                                    Hedef: {dp.targetQuestions} Soru
                                    {dp.solvedQuestions ? ` • Çözülen: ${dp.solvedQuestions}` : ""}
                                  </p>
                                )}
                              </div>
                              <Badge tone={dp.isCompleted ? "green" : "amber"}>
                                {dp.isCompleted ? "Tamamlandı" : "Bekliyor"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {dayLessons.map((l) => {
                      const endTime = new Date(l.startTime.toDate().getTime() + l.durationMinutes * 60000);
                      const stProfile = students.find((s) => s.uid === l.studentId);

                      return (
                        <div
                          key={l.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs dark:border-slate-800/80 dark:bg-[#0f1a2c]"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-100 px-2 py-1 text-indigo-800 font-bold text-[11px] shrink-0 dark:bg-indigo-950 dark:text-indigo-300">
                              <span className="leading-tight">{formatTime(l.startTime.toDate())}</span>
                              <span className="text-[9px] text-slate-500 font-normal leading-tight">
                                {formatTime(endTime)}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <UserAvatar icon={stProfile?.avatarIcon} role="STUDENT" size="sm" />
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {isTeacher ? l.studentName : profile?.displayName}
                                </span>
                                {stProfile?.grade && (
                                  <span className="text-[10px] text-slate-400">
                                    • {stProfile.grade}. Sınıf
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                {l.subject}
                              </p>
                              {l.price > 0 && (
                                <p className="text-[10px] text-slate-400">₺{l.price}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 justify-end">
                            <Badge tone={statusTone(l.status)}>
                              {LESSON_STATUS_LABELS[l.status]}
                            </Badge>
                            <Badge tone={paymentTone(l.paymentStatus)}>
                              {PAYMENT_STATUS_LABELS[l.paymentStatus]}
                            </Badge>
                            {isTeacher && (
                              <button
                                type="button"
                                onClick={() => setPostLessonFor(l)}
                                className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 shadow-xs"
                              >
                                Ders Sonu
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 space-y-4">
          {days.map((day, i) => {
            const dayLessons = visibleLessons.filter((l) =>
              isSameDay(l.startTime.toDate(), day)
            );
            const dayPlans = plans.filter((p) => p.periodKey === dateKey(day));
            const isToday = dateKey(day) === dateKey();
            return (
              <div key={day.toISOString()}>
                <div className="mb-1.5 flex items-center justify-between">
                  <p
                    className={`text-xs font-semibold ${
                      isToday ? "text-indigo-600" : "text-slate-500"
                    }`}
                  >
                    {DAY_NAMES[i]} • {day.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                    {isToday && " (Bugün)"}
                  </p>
                  {dayPlans.length > 0 && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {dayPlans.length} Program Görevi
                    </span>
                  )}
                </div>

                {/* Günün Program Görevleri (Flow görünümünde) */}
                {dayPlans.length > 0 && (
                  <div className="mb-2 space-y-1.5 rounded-xl border border-amber-200/70 bg-amber-50/40 p-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1">
                      <span>🎯</span> Çalışma Programı
                    </p>
                    {dayPlans.map((dp) => (
                      <div
                        key={dp.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white/90 p-2 text-xs dark:bg-[#151f31]/90 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {dp.title}
                          </p>
                          {dp.targetQuestions > 0 && (
                            <p className="text-[10px] text-slate-500">
                              Hedef: {dp.targetQuestions} Soru
                              {dp.solvedQuestions ? ` • Çözülen: ${dp.solvedQuestions}` : ""}
                            </p>
                          )}
                        </div>
                        <Badge tone={dp.isCompleted ? "green" : "amber"}>
                          {dp.isCompleted ? "Tamamlandı" : "Bekliyor"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {dayLessons.length === 0 && dayPlans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-3 text-center text-xs text-slate-300 dark:border-slate-800 dark:text-slate-600">
                    Ders veya görev yok
                  </div>
                ) : (
                  <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <Card key={lesson.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {isTeacher ? lesson.studentName : lesson.subject}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatTime(lesson.startTime.toDate())} •{" "}
                            {lesson.durationMinutes} dk
                            {isTeacher && ` • ${lesson.subject}`}
                            {lesson.price > 0 && ` • ${lesson.price}₺`}
                          </p>
                          {lesson.proposedTime && (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                              Saat teklifi:{" "}
                              {lesson.proposedTime
                                .toDate()
                                .toLocaleString("tr-TR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge tone={statusTone(lesson.status)}>
                            {LESSON_STATUS_LABELS[lesson.status]}
                          </Badge>
                          <Badge tone={paymentTone(lesson.paymentStatus)}>
                            {PAYMENT_STATUS_LABELS[lesson.paymentStatus]}
                          </Badge>
                        </div>
                      </div>

                      {lesson.parentNote && (
                        <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                          <span className="font-semibold">Veli notu: </span>
                          {lesson.parentNote}
                        </p>
                      )}

                      {/* Öğrenci aksiyonları */}
                      {!isTeacher && lesson.status === "PENDING" && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleStatus(lesson, "CONFIRMED")}
                            className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => setProposeFor(lesson.id)}
                            className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600"
                          >
                            Saat Teklif Et
                          </button>
                        </div>
                      )}
                      {!isTeacher && proposeFor === lesson.id && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="datetime-local"
                            value={proposeValue}
                            onChange={(e) => setProposeValue(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                          />
                          <button
                            onClick={() => handlePropose(lesson)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Gönder
                          </button>
                        </div>
                      )}

                      {/* Öğretmen aksiyonları */}
                      {isTeacher && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {lesson.status === "PENDING" && (
                            <button
                              onClick={() => handleStatus(lesson, "CONFIRMED")}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Onayla
                            </button>
                          )}
                          {lesson.proposedTime && (
                            <button
                              onClick={() => handleAcceptProposal(lesson)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Teklifi Kabul Et
                            </button>
                          )}
                          {(lesson.status === "CONFIRMED" || lesson.status === "PENDING") && (
                            <>
                              <button
                                onClick={() => setPostLessonFor(lesson)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 flex items-center gap-1 shadow-xs transition-colors"
                              >
                                <CheckCircle2 size={13} /> Dersi Tamamla & Ders Sonu
                              </button>
                              <button
                                onClick={() => handleStatus(lesson, "CANCELLED")}
                                className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                İptal
                              </button>
                            </>
                          )}
                          {lesson.status === "COMPLETED" && (
                            <button
                              onClick={() => setPostLessonFor(lesson)}
                              className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                            >
                              <FileText size={13} /> Ders Sonu Raporu
                            </button>
                          )}
                          {lesson.status === "COMPLETED" && lesson.paymentStatus === "UNPAID" && (
                            <button
                              onClick={() => handlePayment(lesson, "PAID")}
                              className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                            >
                              Ödendi İşaretle
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setNoteFor(lesson.id);
                              setNoteText(lesson.parentNote ?? "");
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Veli Notu
                          </button>
                        </div>
                      )}
                      {isTeacher && noteFor === lesson.id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Veliye gösterilecek ders sonu notu..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
                          />
                          <button
                            onClick={() => handleSaveNote(lesson)}
                            className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white"
                          >
                            Notu Kaydet
                          </button>
                        </div>
                      )}

                      {lesson.status !== "CANCELLED" && (
                        <LessonMaterials
                          lesson={lesson}
                          isTeacher={isTeacher}
                          teacherId={profile.uid}
                        />
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {postLessonFor && (
        <PostLessonModal
          lesson={postLessonFor}
          student={students.find((s) => s.uid === postLessonFor.studentId)}
          isOpen={Boolean(postLessonFor)}
          onClose={() => setPostLessonFor(null)}
          onSaved={() => afterMutation(postLessonFor.studentId)}
        />
      )}

      <ScheduleImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        students={students}
        initialStudentId={selectedStudent}
        initialImportMode="LESSONS"
      />
    </div>
  );
}
