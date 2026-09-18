"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileDown,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Card } from "@/components/ui";
import StudentPicker from "@/components/StudentPicker";
import {
  addPlan,
  completePlan,
  deletePlan,
  subscribePlans,
  uncompletePlan,
} from "@/lib/services/plans";
import { subscribeStudents, touchStreak } from "@/lib/services/users";
import { refreshParentView } from "@/lib/services/parent";
import {
  PLAN_TYPE_LABELS,
  type PlanItem,
  type PlanType,
  type TargetGroup,
  type UserProfile,
} from "@/lib/types";
import { getSubjects, getTopics } from "@/lib/curriculum";
import { addDays, dateKey, mondayOf, monthKey, weekKey } from "@/lib/utils";

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type View = PlanType;

function monthCells(d: Date): (Date | null)[] {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Pazartesi başlangıç
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 1; i <= days; i++) {
    cells.push(new Date(d.getFullYear(), d.getMonth(), i));
  }
  return cells;
}

/* ======================================================================
   BAĞIMSIZ TOP-LEVEL BİLEŞENLER (Klavye Kapanması ve Taşmayı Önleyenler)
   ====================================================================== */

function NavHeader({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <button
        onClick={onPrev}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Geri"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={onToday}
        className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {label}
      </button>
      <button
        onClick={onNext}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="İleri"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
  availableSubjects: string[];
  studentGrade?: number;
  targetGroup?: TargetGroup;
  onAdd: (data: { subject: string; topic: string; targetQuestions: number }) => Promise<void>;
}

function AddPlanModal({
  isOpen,
  onClose,
  periodLabel,
  availableSubjects,
  studentGrade,
  targetGroup,
  onAdd,
}: AddPlanModalProps) {
  const [subject, setSubject] = useState(availableSubjects[0] || "Matematik");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubject(availableSubjects[0] || "Matematik");
      setTopic("");
      setCustomTopic("");
      setTarget("");
      setSaving(false);
    }
  }, [isOpen, availableSubjects]);

  const topicsForSubject = useMemo(() => {
    return getTopics(subject, studentGrade, targetGroup);
  }, [subject, studentGrade, targetGroup]);

  if (!isOpen) return null;

  const selectedTopicValue = topic || topicsForSubject[0] || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalTopic =
      topic === "__CUSTOM__"
        ? customTopic.trim()
        : topic
        ? topic.trim()
        : topicsForSubject[0] ?? "";
    setSaving(true);
    try {
      await onAdd({
        subject,
        topic: finalTopic,
        targetQuestions: parseInt(target, 10) || 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#151f31] dark:border dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Plana Ders / Konu Ekle
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{periodLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Ders
            </label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTopic("");
                setCustomTopic("");
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            >
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Müfredat Konusu
            </label>
            <select
              value={topic === "__CUSTOM__" ? "__CUSTOM__" : selectedTopicValue}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            >
              {topicsForSubject.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__CUSTOM__">✏️ Özel Konu Yaz...</option>
            </select>
          </div>

          {topic === "__CUSTOM__" && (
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Özel Konu Adı
              </label>
              <input
                type="text"
                placeholder="Özel konu başlığı girin..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Hedef Soru Sayısı
            </label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Örn. 30"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Ekleniyor..." : "Plana Ekle"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0f1a2c] dark:text-slate-300"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StudentCompleteModalProps {
  isOpen: boolean;
  plan: PlanItem | null;
  onClose: () => void;
  onComplete: (planId: string, solved: number, note: string) => Promise<void>;
}

function StudentCompleteModal({
  isOpen,
  plan,
  onClose,
  onComplete,
}: StudentCompleteModalProps) {
  const [solved, setSolved] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSolved("");
      setNote("");
      setSaving(false);
    }
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setSaving(true);
    try {
      await onComplete(plan.id, parseInt(solved, 10) || 0, note.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#151f31] dark:border dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Görevi Tamamla
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{plan.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Kaç Soru Çözdün?
            </label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Çözülen soru sayısı"
              value={solved}
              onChange={(e) => setSolved(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Notun (İsteğe bağlı)
            </label>
            <input
              type="text"
              placeholder="Çalıştığın konu veya kısa not..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#0f1a2c]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Tamamla"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0f1a2c] dark:text-slate-300"
            >
              Vazgeç
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanItemRow({
  plan,
  isTeacher,
  onDelete,
  onToggleComplete,
  onOpenCompleteModal,
}: {
  plan: PlanItem;
  isTeacher: boolean;
  onDelete: (plan: PlanItem) => void;
  onToggleComplete: (planId: string) => void;
  onOpenCompleteModal: (plan: PlanItem) => void;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      {!isTeacher && (
        <button
          onClick={() =>
            plan.isCompleted ? onToggleComplete(plan.id) : onOpenCompleteModal(plan)
          }
          className="mt-0.5 shrink-0"
          aria-label="Durum değiştir"
        >
          {plan.isCompleted ? (
            <CheckCircle2 className="text-emerald-500" size={20} />
          ) : (
            <Circle className="text-slate-300" size={20} />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold truncate ${
                plan.isCompleted
                  ? "text-slate-400 line-through dark:text-slate-500"
                  : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {plan.title}
            </p>
            {plan.subject && (
              <span className="mt-0.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {plan.subject}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {plan.targetQuestions > 0 && (
              <span className="text-[10px] text-slate-400">
                {plan.targetQuestions} soru
              </span>
            )}
            {isTeacher && (
              <>
                <Badge tone={plan.isCompleted ? "green" : "amber"}>
                  {plan.isCompleted ? "Yapıldı" : "Bekliyor"}
                </Badge>
                <button
                  onClick={() => onDelete(plan)}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                  aria-label="Sil"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        </div>

        {plan.isCompleted && (plan.solvedQuestions || plan.studentNote) && (
          <p className="mt-1 rounded-lg bg-emerald-50/70 p-1.5 text-[11px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {plan.solvedQuestions ? `${plan.solvedQuestions} soru çözüldü. ` : ""}
            {plan.studentNote}
          </p>
        )}
      </div>
    </div>
  );
}

/* ======================================================================
   ANA PROGRAM SAYFASI
   ====================================================================== */

export default function ProgramPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  const isTeacher = profile?.role === "TEACHER";

  useEffect(() => {
    if (!profile || !isTeacher) return;
    return subscribeStudents(profile.uid, setStudents);
  }, [profile, isTeacher]);

  if (!profile) return null;

  if (isTeacher) {
    return (
      <div>
        <h1 className="text-xl font-bold">Program Oluştur</h1>
        <div className="mt-4">
          <StudentPicker
            students={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
          />
        </div>
        {selectedStudent ? (
          <ProgramView
            key={selectedStudent}
            studentId={selectedStudent}
            studentProfile={students.find((s) => s.uid === selectedStudent)}
            isTeacher
            teacherId={profile.uid}
          />
        ) : (
          <Card className="mt-4">
            <p className="text-sm text-slate-500">
              Programını görüntülemek için bir öğrenci seçin.
            </p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Çalışma Programım</h1>
      <p className="mt-1 text-sm text-slate-500">
        Öğretmeninin hazırladığı programı takip et, bitirdikçe işaretle.
      </p>
      <ProgramView
        studentId={profile.uid}
        studentProfile={profile}
        isTeacher={false}
        teacherId={profile.uid}
      />
    </div>
  );
}

/* ======================================================================
   PROGRAM VIEW (Günlük, Haftalık, Aylık)
   ====================================================================== */

function ProgramView({
  studentId,
  studentProfile,
  isTeacher,
  teacherId,
}: {
  studentId: string;
  studentProfile?: UserProfile;
  isTeacher: boolean;
  teacherId: string;
}) {
  const { profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [view, setView] = useState<View>("WEEKLY");

  const [dayDate, setDayDate] = useState<Date>(() => new Date());
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf());
  const [monthDate, setMonthDate] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string>(() => dateKey());

  // Modal Durumları
  const [addModalInfo, setAddModalInfo] = useState<{
    isOpen: boolean;
    type: PlanType;
    period: string;
    periodLabel: string;
  } | null>(null);

  const [completeModalPlan, setCompleteModalPlan] = useState<PlanItem | null>(null);

  // Öğrencinin sınıfına ve seçili derslerine göre ders listesi
  const availableSubjects = useMemo(() => {
    if (studentProfile?.enrolledSubjects && studentProfile.enrolledSubjects.length > 0) {
      return studentProfile.enrolledSubjects;
    }
    return getSubjects(studentProfile?.grade, studentProfile?.targetGroup);
  }, [studentProfile]);

  useEffect(() => {
    return subscribePlans(studentId, setPlans);
  }, [studentId]);

  const byPeriod = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    for (const p of plans) {
      const key = `${p.type}:${p.periodKey}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [plans]);

  function itemsOf(type: PlanType, period: string): PlanItem[] {
    return byPeriod.get(`${type}:${period}`) ?? [];
  }

  async function handleAddPlan(data: {
    subject: string;
    topic: string;
    targetQuestions: number;
  }) {
    if (!addModalInfo) return;
    const title = data.topic ? `${data.subject} - ${data.topic}` : data.subject;
    await addPlan({
      teacherId,
      studentId,
      type: addModalInfo.type,
      periodKey: addModalInfo.period,
      title,
      subject: data.subject,
      topic: data.topic || undefined,
      targetQuestions: data.targetQuestions,
    });
    refreshParentView(studentId).catch(() => {});
  }

  async function handleDeletePlan(plan: PlanItem) {
    await deletePlan(plan.id);
    refreshParentView(studentId).catch(() => {});
  }

  async function handleStudentComplete(planId: string, solved: number, note: string) {
    await completePlan(
      planId,
      {
        solvedQuestions: solved,
        studentNote: note,
      },
      { studentId, teacherId: profile?.teacherId ?? teacherId }
    );
    await touchStreak(profile!);
    refreshProfile();
    refreshParentView(studentId).catch(() => {});
  }

  async function handleUncomplete(planId: string) {
    await uncompletePlan(planId);
    refreshParentView(studentId).catch(() => {});
  }

  /* ---------------- Günlük Görünüm ---------------- */
  function renderDailyView() {
    const key = dateKey(dayDate);
    const items = itemsOf("DAILY", key);
    return (
      <div>
        <NavHeader
          label={`${dayDate.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            weekday: "long",
          })}`}
          onPrev={() => setDayDate(addDays(dayDate, -1))}
          onNext={() => setDayDate(addDays(dayDate, 1))}
          onToday={() => setDayDate(new Date())}
        />
        <Card className="mt-3">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((p) => (
              <PlanItemRow
                key={p.id}
                plan={p}
                isTeacher={isTeacher}
                onDelete={handleDeletePlan}
                onToggleComplete={handleUncomplete}
                onOpenCompleteModal={setCompleteModalPlan}
              />
            ))}
            {items.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-400">
                Bu gün için henüz ders/konu eklenmemiş.
              </p>
            )}
          </div>
          {isTeacher && (
            <button
              onClick={() =>
                setAddModalInfo({
                  isOpen: true,
                  type: "DAILY",
                  period: key,
                  periodLabel: `${dayDate.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    weekday: "long",
                  })}`,
                })
              }
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus size={14} /> Ders / Konu Ekle
            </button>
          )}
        </Card>
      </div>
    );
  }

  /* ---------------- Haftalık Görünüm (Mobil Optimize) ---------------- */
  function renderWeeklyView() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const wKey = weekKey(weekStart);
    const weekGoals = itemsOf("WEEKLY", wKey);

    return (
      <div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex-1">
            <NavHeader
              label={`${weekStart.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })} — ${addDays(weekStart, 6).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })}`}
              onPrev={() => setWeekStart(addDays(weekStart, -7))}
              onNext={() => setWeekStart(addDays(weekStart, 7))}
              onToday={() => setWeekStart(mondayOf())}
            />
          </div>
          <a
            href={`/yazdir?ogrenci=${studentId}&hafta=${wKey}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151f31] dark:text-slate-200"
          >
            <FileDown size={14} /> PDF
          </a>
        </div>

        {/* Haftalık genel hedefler */}
        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Haftalık Genel Hedefler ({weekGoals.length})
            </p>
            {isTeacher && (
              <button
                onClick={() =>
                  setAddModalInfo({
                    isOpen: true,
                    type: "WEEKLY",
                    period: wKey,
                    periodLabel: "Haftalık Genel Hedef",
                  })
                }
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={13} /> Hedef Ekle
              </button>
            )}
          </div>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {weekGoals.map((p) => (
              <PlanItemRow
                key={p.id}
                plan={p}
                isTeacher={isTeacher}
                onDelete={handleDeletePlan}
                onToggleComplete={handleUncomplete}
                onOpenCompleteModal={setCompleteModalPlan}
              />
            ))}
            {weekGoals.length === 0 && (
              <p className="py-2 text-xs text-slate-400 italic">
                Haftalık genel hedef bulunmuyor.
              </p>
            )}
          </div>
        </Card>

        {/* 7 Günlük Kutulu Tasarım (Mobil Uyumlu) */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {days.map((day, i) => {
            const key = dateKey(day);
            const items = itemsOf("DAILY", key);
            const isToday = key === dateKey();
            const doneCount = items.filter((p) => p.isCompleted).length;

            return (
              <div
                key={key}
                className={`flex flex-col rounded-2xl bg-white p-3.5 ring-1 transition dark:bg-[#151f31] ${
                  isToday
                    ? "ring-2 ring-indigo-500 shadow-xs"
                    : "ring-slate-100 dark:ring-[#22314d]"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800/80">
                  <p
                    className={`text-xs font-bold ${
                      isToday
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {DAY_NAMES[i]}{" "}
                    <span className="font-normal text-slate-400">
                      • {day.getDate()}/{day.getMonth() + 1}
                    </span>
                    {isToday && " (Bugün)"}
                  </p>
                  {items.length > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doneCount === items.length
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-[#1e2a40] dark:text-slate-300"
                      }`}
                    >
                      {doneCount}/{items.length}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex-1 space-y-1 divide-y divide-slate-50 dark:divide-slate-800/60">
                  {items.map((p) => (
                    <PlanItemRow
                      key={p.id}
                      plan={p}
                      isTeacher={isTeacher}
                      onDelete={handleDeletePlan}
                      onToggleComplete={handleUncomplete}
                      onOpenCompleteModal={setCompleteModalPlan}
                    />
                  ))}
                  {items.length === 0 && (
                    <p className="py-3 text-center text-xs text-slate-300 dark:text-slate-600 italic">
                      Ders eklenmemiş
                    </p>
                  )}
                </div>

                {isTeacher && (
                  <button
                    onClick={() =>
                      setAddModalInfo({
                        isOpen: true,
                        type: "DAILY",
                        period: key,
                        periodLabel: `${DAY_NAMES[i]}, ${day.getDate()} ${
                          MONTH_NAMES[day.getMonth()]
                        }`,
                      })
                    }
                    className="mt-2 flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 py-1.5 text-xs font-semibold text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-800 transition-colors"
                  >
                    <Plus size={13} /> Ders / Konu Ekle
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------------- Aylık Görünüm ---------------- */
  function renderMonthlyView() {
    const mKey = monthKey(monthDate);
    const monthGoals = itemsOf("MONTHLY", mKey);
    const cells = monthCells(monthDate);
    const selected = selectedDay.startsWith(mKey) ? selectedDay : `${mKey}-01`;
    const selectedItems = itemsOf("DAILY", selected);
    const selectedDate = new Date(`${selected}T12:00:00`);

    return (
      <div>
        <NavHeader
          label={`${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`}
          onPrev={() =>
            setMonthDate(
              new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
            )
          }
          onNext={() =>
            setMonthDate(
              new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
            )
          }
          onToday={() => {
            setMonthDate(new Date());
            setSelectedDay(dateKey());
          }}
        />

        {/* Aylık hedefler */}
        <Card className="mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Aylık Hedefler ({monthGoals.length})
            </p>
            {isTeacher && (
              <button
                onClick={() =>
                  setAddModalInfo({
                    isOpen: true,
                    type: "MONTHLY",
                    period: mKey,
                    periodLabel: `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()} Hedefi`,
                  })
                }
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={13} /> Hedef Ekle
              </button>
            )}
          </div>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {monthGoals.map((p) => (
              <PlanItemRow
                key={p.id}
                plan={p}
                isTeacher={isTeacher}
                onDelete={handleDeletePlan}
                onToggleComplete={handleUncomplete}
                onOpenCompleteModal={setCompleteModalPlan}
              />
            ))}
            {monthGoals.length === 0 && (
              <p className="py-2 text-xs text-slate-400 italic">
                Aylık hedef bulunmuyor.
              </p>
            )}
          </div>
        </Card>

        {/* Takvim Izgarası */}
        <Card className="mt-3 p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 pb-1">
            {DAY_NAMES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={`b${i}`} />;
              const key = dateKey(day);
              const items = itemsOf("DAILY", key);
              const isToday = key === dateKey();
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`flex min-h-10 flex-col items-center justify-center rounded-xl py-1 text-xs font-medium transition ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold"
                      : isToday
                      ? "bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {items.length > 0 && (
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                        items.every((p) => p.isCompleted)
                          ? isSelected
                            ? "bg-emerald-300"
                            : "bg-emerald-500"
                          : isSelected
                          ? "bg-amber-300"
                          : "bg-indigo-500"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Seçili Gün Detayı */}
        <Card className="mt-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {selectedDate.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                weekday: "long",
              })}
            </p>
            {isTeacher && (
              <button
                onClick={() =>
                  setAddModalInfo({
                    isOpen: true,
                    type: "DAILY",
                    period: selected,
                    periodLabel: `${selectedDate.toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                    })}`,
                  })
                }
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={13} /> Ekle
              </button>
            )}
          </div>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {selectedItems.map((p) => (
              <PlanItemRow
                key={p.id}
                plan={p}
                isTeacher={isTeacher}
                onDelete={handleDeletePlan}
                onToggleComplete={handleUncomplete}
                onOpenCompleteModal={setCompleteModalPlan}
              />
            ))}
            {selectedItems.length === 0 && (
              <p className="py-3 text-center text-xs text-slate-400 italic">
                Bu güne ait plan maddesi yok.
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Görünüm Seçici Sekmeler */}
      <div className="mt-4 flex rounded-2xl bg-slate-100 p-1 dark:bg-[#151f31]">
        {(["DAILY", "WEEKLY", "MONTHLY"] as PlanType[]).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
              view === t
                ? "bg-white text-indigo-600 shadow-xs dark:bg-[#0f1a2c] dark:text-indigo-400"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
            }`}
          >
            {PLAN_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {view === "DAILY" && renderDailyView()}
      {view === "WEEKLY" && renderWeeklyView()}
      {view === "MONTHLY" && renderMonthlyView()}

      {/* Bağımsız Ekleme Modalı */}
      {addModalInfo && (
        <AddPlanModal
          isOpen={addModalInfo.isOpen}
          onClose={() => setAddModalInfo(null)}
          periodLabel={addModalInfo.periodLabel}
          availableSubjects={availableSubjects}
          studentGrade={studentProfile?.grade}
          targetGroup={studentProfile?.targetGroup}
          onAdd={handleAddPlan}
        />
      )}

      {/* Bağımsız Öğrenci Tamamlama Modalı */}
      <StudentCompleteModal
        isOpen={Boolean(completeModalPlan)}
        plan={completeModalPlan}
        onClose={() => setCompleteModalPlan(null)}
        onComplete={handleStudentComplete}
      />
    </div>
  );
}
