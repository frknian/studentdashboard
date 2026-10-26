"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  ExternalLink,
  Flame,
  LineChart,
  Link as LinkIcon,
  MessageCircleQuestion,
  MessageSquareText,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import StudentPicker from "@/components/StudentPicker";
import { useAuth } from "@/contexts/AuthContext";
import { Card, ProgressBar, SectionTitle, Badge, EmptyState, Sheet } from "@/components/ui";
import PostLessonModal from "@/components/PostLessonModal";
import { createNotification } from "@/lib/services/notifications";
import {
  subscribeWeekTasks,
  addTask,
  addTaskProgress,
  completeTask,
  uncompleteTask,
  deleteTask,
} from "@/lib/services/tasks";
import { subscribeLessonsForTeacher } from "@/lib/services/lessons";
import { subscribeStudents, touchStreak } from "@/lib/services/users";
import { subscribeNotes } from "@/lib/services/notes";
import { refreshParentView } from "@/lib/services/parent";
import { getSubjects, getTopics } from "@/lib/curriculum";
import type { Lesson, NoteItem, StudyTask, UserProfile } from "@/lib/types";
import { formatTime, isSameMonth, weekKey, mondayOf, addDays } from "@/lib/utils";

export default function DashboardPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return profile.role === "STUDENT" ? <StudentDashboard /> : <TeacherDashboard />;
}

/* ------------------------------- ÖĞRENCİ ------------------------------- */

function StudentDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [note, setNote] = useState("");

  const week = weekKey();

  useEffect(() => {
    if (!profile) return;
    const u1 = subscribeWeekTasks(profile.uid, week, setTasks);
    const u2 = subscribeNotes(profile.uid, setNotes);
    return () => {
      u1();
      u2();
    };
  }, [profile, week]);

  if (!profile) return null;

  const weeklyTarget = profile.weeklyTarget ?? 0;
  const completed = tasks.reduce((s, t) => s + t.completedQuestions, 0);

  async function handleAddProgress(task: StudyTask) {
    const amount = parseInt(progressInputs[task.id] ?? "", 10);
    if (!amount || amount <= 0) return;
    await addTaskProgress(task.id, amount);
    await touchStreak(profile!);
    refreshProfile();
    setProgressInputs((p) => ({ ...p, [task.id]: "" }));
  }

  async function handleComplete(taskId: string) {
    const targetTask = tasks.find((t) => t.id === taskId);
    await completeTask(taskId, { difficulty, note });
    await touchStreak(profile!);
    refreshProfile();
    setFeedbackFor(null);
    setNote("");
    setDifficulty(3);

    if (profile?.teacherId) {
      createNotification({
        recipientId: profile.teacherId,
        senderId: profile.uid,
        senderName: profile.displayName || "Öğrenci",
        title: "Ödev Tamamlandı 🎉",
        body: `${profile.displayName} "${targetTask?.title || "Ödev"}" görevini tamamladı (Zorluk: ${difficulty}/5).`,
        link: "/panel",
      }).catch(() => {});
    }
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-fuchsia-600 p-5 text-white shadow-float">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-white/75">Merhaba 👋</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{profile.displayName}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur">
            <Flame size={16} className="text-amber-300" />
            {profile.streak ?? 0} gün
          </div>
        </div>
        <div className="relative mt-5 flex items-center gap-4">
          <ProgressRing value={completed} max={weeklyTarget || completed || 1} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Haftalık soru hedefi
            </p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
              {completed}
              <span className="text-lg font-semibold text-white/60"> / {weeklyTarget || "—"}</span>
            </p>
            <p className="mt-0.5 text-xs text-white/60">
              Hafta başı: {mondayOf().toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>
      </section>

      {notes.filter((n) => n.audience !== "PARENT").length > 0 && (
        <Card className="mt-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
              <MessageSquareText size={15} />
            </span>
            Öğretmeninden notlar
          </h2>
          <div className="mt-2 space-y-2">
            {notes
              .filter((n) => n.audience !== "PARENT")
              .slice(0, 3)
              .map((n) => (
                <div key={n.id} className="rounded-2xl bg-indigo-50/60 p-3">
                  <p className="text-sm text-slate-700">{n.text}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {n.createdAt?.toDate().toLocaleDateString("tr-TR")}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      )}

      <SectionTitle title="Bu Haftanın Görevleri" />
      {tasks.length === 0 && (
        <EmptyState icon={<ClipboardList size={32} />}>
          Bu hafta için görev tanımlanmamış. Öğretmeniniz görev eklediğinde burada
          görünecek.
        </EmptyState>
      )}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex items-start gap-3">
              <button
                onClick={() =>
                  task.isCompleted ? uncompleteTask(task.id) : setFeedbackFor(task.id)
                }
                className="-m-1.5 shrink-0 p-1.5"
                aria-label="Görev durumu"
              >
                {task.isCompleted ? (
                  <CheckCircle2 className="text-emerald-500" size={28} />
                ) : (
                  <Circle className="text-slate-300" size={28} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p
                      className={`text-sm font-semibold ${
                        task.isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.subject && (
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {task.subject}
                      </span>
                    )}
                    {task.topic && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {task.topic}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    {task.completedQuestions}/{task.targetQuestions} soru
                  </span>
                </div>

                {task.description && (
                  <p className="mt-2 whitespace-pre-line rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs text-slate-600">
                    {task.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {task.driveLink && (
                    <a
                      href={task.driveLink.startsWith("http") ? task.driveLink : `https://${task.driveLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <ExternalLink size={12} /> Google Drive / Ödev Linki ↗
                    </a>
                  )}

                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                      <Clock size={12} />
                      Son Teslim: {task.dueDate.toDate().toLocaleDateString("tr-TR")}
                    </span>
                  )}
                </div>

                <div className="mt-2.5">
                  <ProgressBar
                    value={task.completedQuestions}
                    max={task.targetQuestions || 1}
                  />
                </div>
                {task.feedback && (
                  <p className="mt-2 text-xs text-slate-400">
                    Zorluk: {task.feedback.difficulty}/5 — {task.feedback.note}
                  </p>
                )}

                {!task.isCompleted && feedbackFor !== task.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="Kaç soru çözdün?"
                      value={progressInputs[task.id] ?? ""}
                      onChange={(e) =>
                        setProgressInputs((p) => ({ ...p, [task.id]: e.target.value }))
                      }
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => handleAddProgress(task)}
                      className="rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white"
                    >
                      Ekle
                    </button>
                  </div>
                )}

                {!task.isCompleted && feedbackFor === task.id && (
                  <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-500">Zorluk</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setDifficulty(n)}
                          className={`h-10 w-10 rounded-full text-sm font-bold ${
                            difficulty === n
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-slate-500 ring-1 ring-slate-200"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Kısa not (isteğe bağlı)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeedbackFor(null)}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 ring-1 ring-slate-200"
                      >
                        Vazgeç
                      </button>
                      <button
                        onClick={() => handleComplete(task.id)}
                        className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white"
                      >
                        Görevi Tamamla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ ÖĞRETMEN ------------------------------- */

function TeacherDashboard() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskStudent, setTaskStudent] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [taskTopic, setTaskTopic] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDriveLink, setTaskDriveLink] = useState("");
  const [taskTarget, setTaskTarget] = useState("30");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const [selectedStudentTasks, setSelectedStudentTasks] = useState<StudyTask[]>([]);
  const [postLessonFor, setPostLessonFor] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!profile) return;
    const u1 = subscribeStudents(profile.uid, setStudents);
    const u2 = subscribeLessonsForTeacher(profile.uid, setLessons);
    return () => {
      u1();
      u2();
    };
  }, [profile]);

  useEffect(() => {
    if (!taskStudent) {
      setSelectedStudentTasks([]);
      return;
    }
    return subscribeWeekTasks(taskStudent, weekKey(), setSelectedStudentTasks);
  }, [taskStudent]);

  const selectedStudentObj = useMemo(
    () => students.find((s) => s.uid === taskStudent),
    [students, taskStudent]
  );

  const availableSubjects = useMemo(() => {
    if (!selectedStudentObj) return [];
    if (selectedStudentObj.enrolledSubjects && selectedStudentObj.enrolledSubjects.length > 0) {
      return selectedStudentObj.enrolledSubjects;
    }
    return getSubjects(selectedStudentObj.grade, selectedStudentObj.targetGroup);
  }, [selectedStudentObj]);

  const availableTopics = useMemo(() => {
    if (!selectedStudentObj || !taskSubject) return [];
    return getTopics(taskSubject, selectedStudentObj.grade, selectedStudentObj.targetGroup);
  }, [selectedStudentObj, taskSubject]);

  const stats = useMemo(() => {
    const now = new Date();
    const start = mondayOf();
    const end = addDays(start, 7);
    const weekLessons = lessons.filter((l) => {
      const d = l.startTime.toDate();
      return d >= start && d < end && l.status !== "CANCELLED";
    });
    const monthLessons = lessons.filter(
      (l) => isSameMonth(l.startTime.toDate(), now) && l.status === "COMPLETED"
    );
    const unpaid = monthLessons
      .filter((l) => l.paymentStatus === "UNPAID")
      .reduce((s, l) => s + l.price, 0);
    return { weekCount: weekLessons.length, unpaid };
  }, [lessons]);

  if (!profile) return null;

  async function handleAddTask() {
    const target = parseInt(taskTarget, 10) || 0;
    if (!taskStudent || !taskTitle.trim()) return;
    setTaskBusy(true);
    try {
      const due = taskDueDate ? new Date(taskDueDate) : null;
      await addTask({
        teacherId: profile!.uid,
        studentId: taskStudent,
        week: weekKey(),
        title: taskTitle.trim(),
        subject: taskSubject || undefined,
        topic: taskTopic || undefined,
        description: taskDesc.trim() || undefined,
        driveLink: taskDriveLink.trim() || undefined,
        targetQuestions: target,
        dueDate: due,
      });
      createNotification({
        recipientId: taskStudent,
        senderId: profile!.uid,
        senderName: profile!.displayName || "Öğretmen",
        title: "Yeni Ödev Eklendi 📚",
        body: `${taskSubject ? `${taskSubject}: ` : ""}${taskTitle.trim()} (${target} Soru Hedefi)`,
        link: "/panel",
      }).catch(() => {});

      refreshParentView(taskStudent).catch(() => {});
      setTaskTitle("");
      setTaskDesc("");
      setTaskDriveLink("");
      setTaskDueDate("");
      setTaskSubject("");
      setTaskTopic("");
      setTaskTarget("30");
      setShowTaskForm(false);
    } finally {
      setTaskBusy(false);
    }
  }

  return (
    <div>
      <header>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
          Hoş geldiniz, {profile.displayName.split(" ")[0]} 👋
        </h1>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <StatTile icon={<Users size={18} />} value={students.length} label="Öğrenci" href="/panel/ogrenciler" />
        <StatTile icon={<CalendarDays size={18} />} value={stats.weekCount} label="Bu hafta ders" href="/panel/takvim" />
        <StatTile
          icon={<Wallet size={18} />}
          value={`${stats.unpaid}₺`}
          label="Bekleyen ödeme"
          href="/panel/finans"
          tone="rose"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          onClick={() => setShowTaskForm(true)}
          className="col-span-2 flex items-center gap-3 rounded-3xl bg-indigo-600 p-4 text-left text-white shadow-lg shadow-indigo-600/25"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Plus size={22} />
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-bold">Yeni ödev / görev ver</span>
            <span className="block text-xs text-white/70">Öğrenciye ve veliye anında yansır</span>
          </span>
          <ChevronRight size={20} className="text-white/60" />
        </button>
        <QuickLink href="/panel/sorular" icon={<MessageCircleQuestion size={20} />} label="Soru Kumbarası" />
        <QuickLink href="/panel/analiz" icon={<LineChart size={20} />} label="Deneme Analizi" />
      </div>

      <Sheet open={showTaskForm} onClose={() => setShowTaskForm(false)} title="Yeni Ödev / Görev">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Öğrenci</label>
            <div className="mt-1.5">
              <StudentPicker
                students={students}
                value={taskStudent}
                onChange={(id) => {
                  setTaskStudent(id);
                  setTaskSubject("");
                  setTaskTopic("");
                }}
              />
            </div>
          </div>

          {taskStudent && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Ders (Müfredat)</label>
                <select
                  value={taskSubject}
                  onChange={(e) => {
                    const sub = e.target.value;
                    setTaskSubject(sub);
                    setTaskTopic("");
                    if (sub) setTaskTitle(`${sub} Ödevi`);
                  }}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
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
                <label className="text-xs font-semibold text-slate-600">Konu</label>
                <select
                  value={taskTopic}
                  onChange={(e) => {
                    const top = e.target.value;
                    setTaskTopic(top);
                    if (taskSubject && top) setTaskTitle(`${taskSubject} - ${top}`);
                  }}
                  disabled={!taskSubject}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-50"
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
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600">Ödev Başlığı</label>
            <input
              type="text"
              placeholder="Ödev başlığı (örn. Matematik - Üslü Sayılar Test 1-3)"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Ödev Yönergesi / Açıklama</label>
            <textarea
              rows={2}
              placeholder="Öğrencinin yapması gerekenler, kaynak kitap ve test numaraları..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Hedef Soru Sayısı</label>
              <input
                type="number"
                min={0}
                placeholder="Örn. 40"
                value={taskTarget}
                onChange={(e) => setTaskTarget(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Son Teslim Tarihi</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Google Drive / Ödev Linki</label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <LinkIcon size={14} />
              </div>
              <input
                type="url"
                placeholder="https://drive.google.com/... (ödev dokümanı veya PDF linki)"
                value={taskDriveLink}
                onChange={(e) => setTaskDriveLink(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 flex gap-2 bg-white px-5 pt-2">
            <button
              onClick={() => setShowTaskForm(false)}
              className="rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-600"
            >
              İptal
            </button>
            <button
              onClick={handleAddTask}
              disabled={taskBusy || !taskStudent || !taskTitle.trim()}
              className="flex-1 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {taskBusy ? "Kaydediliyor..." : "Ödevi Ver"}
            </button>
          </div>
        </div>
      </Sheet>

      {/* Seçili Öğrencinin Bu Haftaki Ödevleri */}
      {taskStudent && selectedStudentTasks.length > 0 && (
        <div className="space-y-2">
          <SectionTitle title={`${selectedStudentObj?.displayName} • bu haftaki ödevler (${selectedStudentTasks.length})`} />
          {selectedStudentTasks.map((t) => (
            <Card key={t.id} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={`text-xs font-bold ${t.isCompleted ? "text-emerald-600" : "text-slate-800"}`}>
                      {t.title}
                    </p>
                    {t.subject && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                        {t.subject}
                      </span>
                    )}
                    {t.topic && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {t.topic}
                      </span>
                    )}
                    {t.isCompleted && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        Tamamlandı ✓
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="mt-1 text-xs text-slate-600">{t.description}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>Çözülen: {t.completedQuestions} / {t.targetQuestions} soru</span>
                    {t.driveLink && (
                      <a
                        href={t.driveLink.startsWith("http") ? t.driveLink : `https://${t.driveLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold"
                      >
                        <ExternalLink size={11} /> Drive Linki
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await deleteTask(t.id);
                    refreshParentView(taskStudent).catch(() => {});
                  }}
                  className="-m-1 rounded-2xl p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                  aria-label="Ödevi sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SectionTitle title="Yaklaşan Dersler" />
      <div className="space-y-2">
        {lessons
          .filter((l) => l.startTime.toDate() >= new Date() && l.status !== "CANCELLED")
          .slice(0, 5)
          .map((l) => (
            <Card key={l.id} className="flex items-center gap-3 p-3">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:text-indigo-200">
                <span className="text-[11px] font-bold uppercase">
                  {l.startTime.toDate().toLocaleDateString("tr-TR", { weekday: "short" })}
                </span>
                <span className="text-sm font-extrabold leading-tight">
                  {l.startTime.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.studentName}</p>
                <p className="truncate text-xs text-slate-500">
                  {l.subject} • {formatTime(l.startTime.toDate())}
                </p>
                <div className="mt-1">
                  <Badge tone={l.status === "PENDING" ? "amber" : "indigo"}>
                    {l.status === "PENDING" ? "Onay bekliyor" : "Onaylandı"}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => setPostLessonFor(l)}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-2xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white"
              >
                <CheckCircle2 size={18} /> Ders sonu
              </button>
            </Card>
          ))}
        {lessons.filter((l) => l.startTime.toDate() >= new Date() && l.status !== "CANCELLED")
          .length === 0 && (
          <EmptyState icon={<CalendarDays size={32} />}>Yaklaşan ders bulunmuyor.</EmptyState>
        )}
      </div>

      {postLessonFor && (
        <PostLessonModal
          lesson={postLessonFor}
          student={students.find((s) => s.uid === postLessonFor.studentId)}
          isOpen={Boolean(postLessonFor)}
          onClose={() => setPostLessonFor(null)}
          onSaved={() => refreshParentView(postLessonFor.studentId).catch(() => {})}
        />
      )}
    </div>
  );
}

/* ------------------------------ Yardımcılar ------------------------------ */

function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgb(255 255 255 / 0.18)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold">
        %{Math.round(pct * 100)}
      </span>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  href,
  tone = "indigo",
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  href: string;
  tone?: "indigo" | "rose";
}) {
  return (
    <Link href={href} className="active:scale-95">
      <Card className="h-full p-3.5">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
            tone === "rose"
              ? "bg-rose-50 text-rose-500"
              : "bg-indigo-50 text-indigo-600 dark:text-indigo-300"
          }`}
        >
          {icon}
        </span>
        <p className="mt-2.5 truncate text-xl font-extrabold tracking-tight">{value}</p>
        <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
      </Card>
    </Link>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="active:scale-95">
      <Card className="flex h-full items-center gap-3 p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300">
          {icon}
        </span>
        <span className="text-sm font-bold leading-tight">{label}</span>
      </Card>
    </Link>
  );
}
