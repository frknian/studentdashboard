"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Flame,
  LineChart,
  Link as LinkIcon,
  MessageCircleQuestion,
  Plus,
  Settings,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Card, ProgressBar, SectionTitle, Badge } from "@/components/ui";
import PostLessonModal from "@/components/PostLessonModal";
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
    await completeTask(taskId, { difficulty, note });
    await touchStreak(profile!);
    refreshProfile();
    setFeedbackFor(null);
    setNote("");
    setDifficulty(3);
  }

  return (
    <div>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-xs ring-1 ring-slate-200">
            <Image
              src="/logo.png"
              alt="Logo"
              width={44}
              height={44}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs text-slate-500">Merhaba,</p>
            <h1 className="text-xl font-bold">{profile.displayName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
            <Flame size={16} />
            {profile.streak ?? 0} gün
          </div>
          <Link href="/panel/ayarlar" className="text-slate-400" aria-label="Ayarlar">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {notes.filter((n) => n.audience !== "PARENT").length > 0 && (
        <Card className="mt-5 border-l-4 border-l-indigo-400">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Öğretmeninden Notlar
          </h2>
          <div className="mt-2 space-y-2">
            {notes
              .filter((n) => n.audience !== "PARENT")
              .slice(0, 3)
              .map((n) => (
                <div key={n.id} className="rounded-lg bg-indigo-50/60 p-2.5">
                  <p className="text-sm text-slate-700">{n.text}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {n.createdAt?.toDate().toLocaleDateString("tr-TR")}
                  </p>
                </div>
              ))}
          </div>
        </Card>
      )}

      <Card className="mt-5">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="font-semibold">Haftalık Soru Hedefi</h2>
          <span className="text-sm text-slate-500">
            <span className="text-lg font-bold text-indigo-600">{completed}</span>
            {" / "}
            {weeklyTarget || "—"}
          </span>
        </div>
        <ProgressBar value={completed} max={weeklyTarget || completed || 1} />
        <p className="mt-2 text-xs text-slate-400">
          Hafta başlangıcı: {mondayOf().toLocaleDateString("tr-TR")}
        </p>
      </Card>

      <SectionTitle title="Bu Haftanın Görevleri" />
      {tasks.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">
            Bu hafta için görev tanımlanmamış. Öğretmeniniz görev eklediğinde burada
            görünecek.
          </p>
        </Card>
      )}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id}>
            <div className="flex items-start gap-3">
              <button
                onClick={() =>
                  task.isCompleted ? uncompleteTask(task.id) : setFeedbackFor(task.id)
                }
                className="mt-0.5 shrink-0"
                aria-label="Görev durumu"
              >
                {task.isCompleted ? (
                  <CheckCircle2 className="text-emerald-500" size={24} />
                ) : (
                  <Circle className="text-slate-300" size={24} />
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
                      <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {task.subject}
                      </span>
                    )}
                    {task.topic && (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {task.topic}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-500 shrink-0">
                    {task.completedQuestions}/{task.targetQuestions} soru
                  </span>
                </div>

                {task.description && (
                  <p className="mt-2 whitespace-pre-line rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-600">
                    {task.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {task.driveLink && (
                    <a
                      href={task.driveLink.startsWith("http") ? task.driveLink : `https://${task.driveLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
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
                      min={1}
                      placeholder="Çözülen"
                      value={progressInputs[task.id] ?? ""}
                      onChange={(e) =>
                        setProgressInputs((p) => ({ ...p, [task.id]: e.target.value }))
                      }
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleAddProgress(task)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Ekle
                    </button>
                  </div>
                )}

                {!task.isCompleted && feedbackFor === task.id && (
                  <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Zorluk:</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setDifficulty(n)}
                          className={`h-7 w-7 rounded-full text-xs font-bold ${
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
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white"
                    >
                      Görevi Tamamla
                    </button>
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
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-xs ring-1 ring-slate-200">
            <Image
              src="/logo.png"
              alt="Logo"
              width={44}
              height={44}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs text-slate-500">Hoş geldiniz,</p>
            <h1 className="text-xl font-bold">{profile.displayName}</h1>
          </div>
        </div>
        <Link href="/panel/ayarlar" className="text-slate-400" aria-label="Ayarlar">
          <Settings size={20} />
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Card className="text-center">
          <Users className="mx-auto text-indigo-500" size={20} />
          <p className="mt-1 text-xl font-bold">{students.length}</p>
          <p className="text-[11px] text-slate-500">Öğrenci</p>
        </Card>
        <Card className="text-center">
          <CalendarDays className="mx-auto text-indigo-500" size={20} />
          <p className="mt-1 text-xl font-bold">{stats.weekCount}</p>
          <p className="text-[11px] text-slate-500">Bu Hafta Ders</p>
        </Card>
        <Link href="/panel/finans">
          <Card className="text-center transition hover:ring-rose-200">
            <Wallet className="mx-auto text-rose-500" size={20} />
            <p className="mt-1 text-xl font-bold">{stats.unpaid}₺</p>
            <p className="text-[11px] text-slate-500">Bekleyen Ödeme</p>
          </Card>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/panel/sorular">
          <Card className="flex items-center gap-3 transition hover:ring-indigo-200">
            <MessageCircleQuestion className="text-indigo-500" size={22} />
            <span className="text-sm font-semibold">Soru Kumbarası</span>
          </Card>
        </Link>
        <Link href="/panel/denemeler">
          <Card className="flex items-center gap-3 transition hover:ring-indigo-200">
            <LineChart className="text-indigo-500" size={22} />
            <span className="text-sm font-semibold">Deneme Analizi</span>
          </Card>
        </Link>
      </div>

      <SectionTitle
        title="Ödevlendirme & Görev Sistemi"
        action={
          <button
            onClick={() => setShowTaskForm((v) => !v)}
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <Plus size={16} /> Yeni Ödev / Görev
          </button>
        }
      />
      {showTaskForm && (
        <Card className="space-y-3 border-indigo-100 bg-indigo-50/20">
          <div>
            <label className="text-xs font-semibold text-slate-600">Öğrenci</label>
            <select
              value={taskStudent}
              onChange={(e) => {
                setTaskStudent(e.target.value);
                setTaskSubject("");
                setTaskTopic("");
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            >
              <option value="">Öğrenci seçin</option>
              {students.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.displayName} {s.grade ? `(${s.grade}. Sınıf)` : ""}
                </option>
              ))}
            </select>
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 disabled:opacity-50"
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
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Ödev Yönergesi / Açıklama</label>
            <textarea
              rows={2}
              placeholder="Öğrencinin yapması gerekenler, kaynak kitap ve test numaraları..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Son Teslim Tarihi</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400"
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
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddTask}
              disabled={taskBusy || !taskStudent || !taskTitle.trim()}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {taskBusy ? "Kaydediliyor..." : "Ödevi Tanımla & Veliye Yansıt"}
            </button>
            <button
              onClick={() => setShowTaskForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              İptal
            </button>
          </div>
        </Card>
      )}

      {/* Seçili Öğrencinin Bu Haftaki Ödevleri */}
      {taskStudent && selectedStudentTasks.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            {selectedStudentObj?.displayName} için Bu Haftanın Ödevleri ({selectedStudentTasks.length})
          </p>
          {selectedStudentTasks.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={`text-xs font-bold ${t.isCompleted ? "text-emerald-600" : "text-slate-800"}`}>
                      {t.title}
                    </p>
                    {t.subject && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {t.subject}
                      </span>
                    )}
                    {t.topic && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {t.topic}
                      </span>
                    )}
                    {t.isCompleted && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
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
                  className="p-1 text-slate-300 hover:text-rose-500"
                  aria-label="Ödevi sil"
                >
                  <Trash2 size={14} />
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
            <Card key={l.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold">{l.studentName}</p>
                <p className="text-xs text-slate-500">
                  {l.subject} • {formatTime(l.startTime.toDate())}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPostLessonFor(l)}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 flex items-center gap-1 shadow-xs transition-colors"
                >
                  <CheckCircle2 size={12} /> Ders Sonu
                </button>
                <Badge tone={l.status === "PENDING" ? "amber" : "indigo"}>
                  {l.status === "PENDING" ? "Onay Bekliyor" : "Onaylandı"}
                </Badge>
              </div>
            </Card>
          ))}
        {lessons.filter((l) => l.startTime.toDate() >= new Date() && l.status !== "CANCELLED")
          .length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">Yaklaşan ders bulunmuyor.</p>
          </Card>
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
