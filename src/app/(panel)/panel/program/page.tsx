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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Card, SectionTitle } from "@/components/ui";
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

/* ---------------------------- ANA GÖRÜNÜM ---------------------------- */

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

  // Öğrencinin sınıfına ve seçili derslerine göre ders listesi
  const availableSubjects = useMemo(() => {
    if (studentProfile?.enrolledSubjects && studentProfile.enrolledSubjects.length > 0) {
      return studentProfile.enrolledSubjects;
    }
    return getSubjects(studentProfile?.grade, studentProfile?.targetGroup);
  }, [studentProfile]);

  // öğretmen ekleme formu: ders, konu ve hedef soru
  const [addFor, setAddFor] = useState<string | null>(null);
  const [formSubject, setFormSubject] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [formTarget, setFormTarget] = useState("");

  // Ders değiştiğinde konuyu ilk konuya ayarla
  const currentSubject = formSubject || availableSubjects[0] || "Matematik";
  const topicsForSubject = useMemo(() => {
    return getTopics(
      currentSubject,
      studentProfile?.grade,
      studentProfile?.targetGroup
    );
  }, [currentSubject, studentProfile]);

  // öğrenci tamamlama formu
  const [entryFor, setEntryFor] = useState<string | null>(null);
  const [solved, setSolved] = useState("");
  const [note, setNote] = useState("");

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

  async function handleAdd(type: PlanType, period: string) {
    const subject = currentSubject;
    const finalTopic =
      formTopic === "__CUSTOM__"
        ? customTopic.trim()
        : formTopic
        ? formTopic.trim()
        : topicsForSubject[0] ?? "";
    const title = finalTopic ? `${subject} - ${finalTopic}` : subject;
    if (!title.trim()) return;

    await addPlan({
      teacherId,
      studentId,
      type,
      periodKey: period,
      title,
      subject,
      topic: finalTopic || undefined,
      targetQuestions: parseInt(formTarget, 10) || 0,
    });
    refreshParentView(studentId).catch(() => {});
    setFormTopic("");
    setCustomTopic("");
    setFormTarget("");
    setAddFor(null);
  }

  async function handleDelete(plan: PlanItem) {
    await deletePlan(plan.id);
    refreshParentView(studentId).catch(() => {});
  }

  async function handleComplete(planId: string) {
    await completePlan(
      planId,
      {
        solvedQuestions: parseInt(solved, 10) || 0,
        studentNote: note.trim(),
      },
      { studentId, teacherId: profile?.teacherId ?? teacherId }
    );
    await touchStreak(profile!);
    refreshProfile();
    refreshParentView(studentId).catch(() => {});
    setEntryFor(null);
    setSolved("");
    setNote("");
  }

  /* ------------------------- parçalar ------------------------- */

  function AddForm({ type, period }: { type: PlanType; period: string }) {
    const selectedTopicValue = formTopic || topicsForSubject[0] || "";

    return (
      <div className="mt-2 space-y-2.5 rounded-xl border border-indigo-100 bg-slate-50 p-3 dark:border-indigo-950 dark:bg-slate-800/80">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Ders Seçimi */}
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Ders
            <select
              value={currentSubject}
              onChange={(e) => {
                setFormSubject(e.target.value);
                setFormTopic("");
                setCustomTopic("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#151f31]"
            >
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {/* Konu Seçimi */}
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Müfredat Konusu
            <select
              value={formTopic === "__CUSTOM__" ? "__CUSTOM__" : selectedTopicValue}
              onChange={(e) => setFormTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#151f31]"
            >
              {topicsForSubject.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__CUSTOM__">✏️ Özel Konu Yaz...</option>
            </select>
          </label>
        </div>

        {formTopic === "__CUSTOM__" && (
          <input
            type="text"
            placeholder="Özel konu başlığı girin..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#151f31]"
          />
        )}

        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Hedef soru sayısı"
            value={formTarget}
            onChange={(e) => setFormTarget(e.target.value)}
            className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-[#151f31]"
          />
          <button
            onClick={() => handleAdd(type, period)}
            className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Plana Ekle
          </button>
          <button
            onClick={() => setAddFor(null)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#151f31]"
          >
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  function AddButton({ id, label = "Ders / Konu Ekle" }: { id: string; label?: string }) {
    if (!isTeacher) return null;
    if (addFor === id) return null;
    return (
      <button
        onClick={() => {
          setAddFor(id);
          setFormSubject(availableSubjects[0] ?? "Matematik");
          setFormTopic("");
          setCustomTopic("");
          setFormTarget("");
        }}
        className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600"
      >
        <Plus size={14} /> {label}
      </button>
    );
  }

  function PlanRow({ plan }: { plan: PlanItem }) {
    const completing = entryFor === plan.id;
    return (
      <div className="flex items-start gap-2.5 py-1.5">
        {!isTeacher && (
          <button
            onClick={() =>
              plan.isCompleted ? uncompletePlan(plan.id) : setEntryFor(plan.id)
            }
            className="mt-0.5 shrink-0"
            aria-label="Durum değiştir"
          >
            {plan.isCompleted ? (
              <CheckCircle2 className="text-emerald-500" size={21} />
            ) : (
              <Circle className="text-slate-300" size={21} />
            )}
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p
                className={`text-sm font-medium ${
                  plan.isCompleted ? "text-slate-400 line-through" : ""
                }`}
              >
                {plan.title}
              </p>
              {plan.subject && (
                <span className="mt-0.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {plan.subject}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {plan.targetQuestions > 0 && (
                <span className="text-[11px] text-slate-400">
                  {plan.targetQuestions} soru
                </span>
              )}
              {isTeacher && (
                <>
                  <Badge tone={plan.isCompleted ? "green" : "amber"}>
                    {plan.isCompleted ? "Yapıldı" : "Bekliyor"}
                  </Badge>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-1 text-slate-300 transition hover:text-rose-500"
                    aria-label="Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>

          {plan.isCompleted && (plan.solvedQuestions || plan.studentNote) && (
            <p className="mt-1 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
              {isTeacher && <span className="font-semibold">Öğrenci: </span>}
              {plan.solvedQuestions ? `${plan.solvedQuestions} soru çözüldü. ` : ""}
              {plan.studentNote}
            </p>
          )}

          {!isTeacher && !plan.isCompleted && completing && (
            <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Kaç soru çözdün?"
                value={solved}
                onChange={(e) => setSolved(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <input
                type="text"
                placeholder="Çalıştığın konu / kısa not"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleComplete(plan.id)}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white"
                >
                  Tamamla
                </button>
                <button
                  onClick={() => setEntryFor(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function PlanList({ items }: { items: PlanItem[] }) {
    if (items.length === 0) {
      return <p className="py-1.5 text-xs text-slate-300">Kayıt yok</p>;
    }
    return (
      <div className="divide-y divide-slate-50">
        {items.map((p) => (
          <PlanRow key={p.id} plan={p} />
        ))}
      </div>
    );
  }

  /* ------------------------- görünümler ------------------------ */

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
        <button onClick={onPrev} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Geri">
          <ChevronLeft size={18} />
        </button>
        <button onClick={onToday} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-slate-100">
          {label}
        </button>
        <button onClick={onNext} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="İleri">
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  function renderDailyView() {
    const key = dateKey(dayDate);
    const items = itemsOf("DAILY", key);
    const formId = `day:${key}`;
    return (
      <div>
        <NavHeader
          label={`${dayDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })}`}
          onPrev={() => setDayDate(addDays(dayDate, -1))}
          onNext={() => setDayDate(addDays(dayDate, 1))}
          onToday={() => setDayDate(new Date())}
        />
        <Card className="mt-3">
          <PlanList items={items} />
          <AddButton id={formId} />
          {addFor === formId && <AddForm type="DAILY" period={key} />}
        </Card>
      </div>
    );
  }

  function renderWeeklyView() {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const wKey = weekKey(weekStart);
    const weekGoals = itemsOf("WEEKLY", wKey);
    const goalFormId = `week:${wKey}`;
    return (
      <div>
        <div className="mt-4 flex items-start justify-between gap-2">
          <div className="flex-1">
            <NavHeader
              label={`${weekStart.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} — ${addDays(weekStart, 6).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`}
              onPrev={() => setWeekStart(addDays(weekStart, -7))}
              onNext={() => setWeekStart(addDays(weekStart, 7))}
              onToday={() => setWeekStart(mondayOf())}
            />
          </div>
          <a
            href={`/yazdir?ogrenci=${studentId}&hafta=${wKey}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FileDown size={14} /> PDF
          </a>
        </div>

        {/* Haftalık genel hedefler */}
        <Card className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Haftalık Hedefler
          </p>
          <PlanList items={weekGoals} />
          <AddButton id={goalFormId} label="Hedef Ekle" />
          {addFor === goalFormId && <AddForm type="WEEKLY" period={wKey} />}
        </Card>

        {/* 7 gün kutulu tasarım */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {days.map((day, i) => {
            const key = dateKey(day);
            const items = itemsOf("DAILY", key);
            const isToday = key === dateKey();
            const formId = `day:${key}`;
            const doneCount = items.filter((p) => p.isCompleted).length;
            return (
              <div
                key={key}
                className={`flex min-h-32 flex-col rounded-2xl bg-white p-3 ring-1 transition dark:bg-[#151f31] ${
                  isToday
                    ? "ring-2 ring-indigo-500"
                    : "ring-slate-100 dark:ring-[#22314d]"
                } ${i === 6 ? "col-span-2" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-bold ${
                      isToday ? "text-indigo-600" : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {DAY_NAMES[i]}{" "}
                    <span className="font-medium text-slate-400">
                      {day.getDate()}/{day.getMonth() + 1}
                    </span>
                  </p>
                  {items.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        doneCount === items.length
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40"
                          : "bg-slate-100 text-slate-500 dark:bg-[#1e2a40]"
                      }`}
                    >
                      {doneCount}/{items.length}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex-1 space-y-1.5">
                  {items.length === 0 && (
                    <p className="text-[10px] text-slate-300">—</p>
                  )}
                  {items.map((p) => (
                    <div key={p.id} className="group flex items-center gap-1">
                      {isTeacher ? (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            p.isCompleted ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                      ) : (
                        <button
                          onClick={() =>
                            p.isCompleted ? uncompletePlan(p.id) : setEntryFor(p.id)
                          }
                          className="shrink-0"
                          aria-label="Durum değiştir"
                        >
                          {p.isCompleted ? (
                            <CheckCircle2 className="text-emerald-500" size={15} />
                          ) : (
                            <Circle className="text-slate-300" size={15} />
                          )}
                        </button>
                      )}
                      <span
                        className={`flex-1 truncate rounded-lg px-1.5 py-1 text-[11px] font-medium ${
                          p.isCompleted
                            ? "bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-slate-50 text-slate-700 dark:bg-[#0f1a2c] dark:text-slate-200"
                        }`}
                        title={p.title}
                      >
                        {p.title}
                      </span>
                      {isTeacher && (
                        <button
                          onClick={() => handleDelete(p)}
                          className="shrink-0 p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                          aria-label="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <AddButton id={formId} label="+ Ekle" />
                {addFor === formId && <AddForm type="DAILY" period={key} />}
              </div>
            );
          })}
        </div>

        {/* Öğrenci tamamlama formu (kutu dışında) */}
        {!isTeacher && entryFor && (
          <Card className="mt-3 space-y-2 border-l-4 border-l-emerald-400">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {plans.find((p) => p.id === entryFor)?.title}
            </p>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Kaç soru çözdün?"
              value={solved}
              onChange={(e) => setSolved(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <input
              type="text"
              placeholder="Çalıştığın konu / kısa not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleComplete(entryFor)}
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white"
              >
                Tamamla
              </button>
              <button
                onClick={() => setEntryFor(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
              >
                Vazgeç
              </button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  function renderMonthlyView() {
    const mKey = monthKey(monthDate);
    const monthGoals = itemsOf("MONTHLY", mKey);
    const goalFormId = `month:${mKey}`;
    const cells = monthCells(monthDate);
    const selected = selectedDay.startsWith(mKey) ? selectedDay : `${mKey}-01`;
    const selectedItems = itemsOf("DAILY", selected);
    const selectedFormId = `day:${selected}`;
    const selectedDate = new Date(`${selected}T12:00:00`);

    return (
      <div>
        <NavHeader
          label={`${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`}
          onPrev={() =>
            setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))
          }
          onNext={() =>
            setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))
          }
          onToday={() => {
            setMonthDate(new Date());
            setSelectedDay(dateKey());
          }}
        />

        {/* Aylık hedefler */}
        <Card className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Aylık Hedefler
          </p>
          <PlanList items={monthGoals} />
          <AddButton id={goalFormId} label="Hedef Ekle" />
          {addFor === goalFormId && <AddForm type="MONTHLY" period={mKey} />}
        </Card>

        {/* Takvim ızgarası */}
        <Card className="mt-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
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
              const allDone =
                items.length > 0 && items.every((p) => p.isCompleted);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`flex min-h-11 flex-col items-center justify-start rounded-lg py-1 text-xs transition ${
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : isToday
                        ? "bg-indigo-50 font-bold text-indigo-600"
                        : "hover:bg-slate-50"
                  }`}
                >
                  <span>{day.getDate()}</span>
                  {items.length > 0 && (
                    <span
                      className={`mt-0.5 flex h-1 gap-0.5 ${
                        isSelected ? "opacity-90" : ""
                      }`}
                    >
                      {items.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className={`h-1 w-1 rounded-full ${
                            p.isCompleted
                              ? isSelected
                                ? "bg-emerald-300"
                                : "bg-emerald-400"
                              : allDone
                                ? "bg-emerald-400"
                                : isSelected
                                  ? "bg-white/70"
                                  : "bg-indigo-400"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Seçili gün detayı */}
        <SectionTitle
          title={selectedDate.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            weekday: "long",
          })}
        />
        <Card>
          <PlanList items={selectedItems} />
          <AddButton id={selectedFormId} />
          {addFor === selectedFormId && <AddForm type="DAILY" period={selected} />}
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
        {(["DAILY", "WEEKLY", "MONTHLY"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              view === v ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            {PLAN_TYPE_LABELS[v]}
          </button>
        ))}
      </div>

      {view === "DAILY" && renderDailyView()}
      {view === "WEEKLY" && renderWeeklyView()}
      {view === "MONTHLY" && renderMonthlyView()}
    </div>
  );
}
