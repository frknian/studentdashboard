"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { Card, SectionTitle } from "@/components/ui";
import StudentPicker from "@/components/StudentPicker";
import { addExam, subscribeExams } from "@/lib/services/exams";
import {
  addQuestionLog,
  subscribeQuestionLogs,
} from "@/lib/services/questionLogs";
import { subscribeStudents, touchStreak } from "@/lib/services/users";
import { subscribePlans } from "@/lib/services/plans";
import { subscribeQuestions } from "@/lib/services/questions";
import { createNotification } from "@/lib/services/notifications";
import { EXAM_SUBJECTS, QUESTION_TOPICS } from "@/lib/examConfig";
import { getSubjects, getTopics } from "@/lib/curriculum";
import {
  addDays,
  computeNet,
  dateKey,
  formatDate,
  mondayOf,
} from "@/lib/utils";
import type {
  ExamResult,
  PlanItem,
  QuestionItem,
  QuestionLog,
  SubjectScore,
  UserProfile,
} from "@/lib/types";

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DYB_COLORS = ["#10b981", "#f43f5e", "#94a3b8"];

export default function AnalysisPage() {
  const { profile, refreshProfile } = useAuth();
  const isTeacher = profile?.role === "TEACHER";

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [logs, setLogs] = useState<QuestionLog[]>([]);
  const [plansData, setPlansData] = useState<PlanItem[]>([]);
  const [questionsData, setQuestionsData] = useState<QuestionItem[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf());

  // soru girişi (öğrenci)
  const [logCount, setLogCount] = useState("");
  const [logDate, setLogDate] = useState(dateKey());

  // deneme formu
  const [showForm, setShowForm] = useState(false);
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [weakInput, setWeakInput] = useState("");
  const [inputs, setInputs] = useState<Record<string, { d: string; y: string; b: string }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile || !isTeacher) return;
    return subscribeStudents(profile.uid, setStudents);
  }, [profile, isTeacher]);

  const activeStudent = isTeacher
    ? students.find((s) => s.uid === selectedStudent)
    : profile;

  useEffect(() => {
    if (!profile) return;
    const studentId = isTeacher ? selectedStudent : profile.uid;
    if (!studentId) return;
    const u1 = subscribeExams(studentId, setExams);
    const u2 = subscribeQuestionLogs(studentId, setLogs);
    const u3 = subscribePlans(studentId, setPlansData);
    const u4 = subscribeQuestions({ studentId }, setQuestionsData);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [profile, isTeacher, selectedStudent]);

  const subjects = useMemo(() => {
    if (activeStudent?.enrolledSubjects && activeStudent.enrolledSubjects.length > 0) {
      return activeStudent.enrolledSubjects;
    }
    if (activeStudent?.grade) {
      return getSubjects(activeStudent.grade, activeStudent.targetGroup);
    }
    const group = activeStudent?.targetGroup ?? "LGS";
    return EXAM_SUBJECTS[group];
  }, [activeStudent]);

  /* ------------------------- türetilmiş veriler ------------------------- */

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const key = dateKey(addDays(weekStart, i));
      const count = logs
        .filter((l) => l.date === key)
        .reduce((s, l) => s + l.count, 0);
      return { day: DAY_NAMES[i], soru: count };
    });
  }, [logs, weekStart]);

  const weekTotal = useMemo(
    () => weeklyData.reduce((s, d) => s + d.soru, 0),
    [weeklyData]
  );

  const netChartData = useMemo(
    () =>
      exams.map((e) => ({
        name: e.examName.length > 12 ? `${e.examName.slice(0, 12)}…` : e.examName,
        net: e.totalNet,
      })),
    [exams]
  );

  const dybData = useMemo(() => {
    let dogru = 0,
      yanlis = 0,
      bos = 0;
    for (const exam of exams) {
      for (const s of Object.values(exam.scores)) {
        dogru += s.dogru;
        yanlis += s.yanlis;
        bos += s.bos ?? 0;
      }
    }
    return [
      { name: "Doğru", value: dogru },
      { name: "Yanlış", value: yanlis },
      { name: "Boş", value: bos },
    ].filter((d) => d.value > 0);
  }, [exams]);

  const dybPerExam = useMemo(
    () =>
      exams.slice(-6).map((e) => {
        let dogru = 0,
          yanlis = 0,
          bos = 0;
        for (const s of Object.values(e.scores)) {
          dogru += s.dogru;
          yanlis += s.yanlis;
          bos += s.bos ?? 0;
        }
        return {
          name: e.examName.length > 10 ? `${e.examName.slice(0, 10)}…` : e.examName,
          dogru,
          yanlis,
          bos,
        };
      }),
    [exams]
  );

  const weakTopics = useMemo(() => {
    const freq = new Map<string, number>();
    for (const exam of exams) {
      for (const t of exam.weakTopics ?? []) {
        const key = t.trim();
        if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [exams]);

  // Konu bazlı çalışma durumu: program başlıkları + soru kumbarası + deneme verileri
  const topicActivity = useMemo(() => {
    const group = activeStudent?.targetGroup ?? "LGS";
    const topics = QUESTION_TOPICS[group].filter((t) => t !== "Diğer");
    return topics.map((topic) => {
      const needle = topic.toLocaleLowerCase("tr");
      const inQuestions = questionsData.filter((q) => q.topic === topic).length;
      const inPlans = plansData.filter((p) =>
        p.title.toLocaleLowerCase("tr").includes(needle)
      ).length;
      const inExams = exams.filter((e) =>
        Object.keys(e.scores).some((k) =>
          k.toLocaleLowerCase("tr").includes(needle)
        )
      ).length;
      return { topic, count: inQuestions + inPlans + inExams };
    });
  }, [activeStudent, questionsData, plansData, exams]);

  const unstudiedTopics = useMemo(
    () => topicActivity.filter((t) => t.count === 0),
    [topicActivity]
  );

  const totalNet = useMemo(() => {
    return subjects.reduce((sum, s) => {
      const d = parseInt(inputs[s]?.d ?? "", 10) || 0;
      const y = parseInt(inputs[s]?.y ?? "", 10) || 0;
      return sum + computeNet(d, y);
    }, 0);
  }, [inputs, subjects]);

  if (!profile) return null;

  function setInput(subject: string, field: "d" | "y" | "b", value: string) {
    setInputs((prev) => ({
      ...prev,
      [subject]: {
        d: prev[subject]?.d ?? "",
        y: prev[subject]?.y ?? "",
        b: prev[subject]?.b ?? "",
        [field]: value,
      },
    }));
  }

  async function handleLogQuestions() {
    const count = parseInt(logCount, 10);
    if (!count || count <= 0 || !profile) return;
    await addQuestionLog({
      studentId: profile.uid,
      teacherId: profile.teacherId ?? "",
      date: logDate || dateKey(),
      count,
    });

    if (profile.teacherId) {
      createNotification({
        recipientId: profile.teacherId,
        senderId: profile.uid,
        senderName: profile.displayName || "Öğrenci",
        title: "Soru Çözümü Kaydedildi 🎯",
        body: `${profile.displayName || "Öğrenciniz"} ${logDate || "bugün"} için ${count} soru çözdüğünü kaydetti.`,
        link: "/panel/analiz",
      }).catch(() => {});
    }

    await touchStreak(profile);
    refreshProfile();
    setLogCount("");
  }

  async function handleSaveExam() {
    if (!activeStudent || !examName.trim() || !examDate) return;
    setSaving(true);
    try {
      const scores: Record<string, SubjectScore> = {};
      for (const s of subjects) {
        const d = parseInt(inputs[s]?.d ?? "", 10) || 0;
        const y = parseInt(inputs[s]?.y ?? "", 10) || 0;
        const b = parseInt(inputs[s]?.b ?? "", 10) || 0;
        if (d === 0 && y === 0 && b === 0) continue;
        scores[s] = { dogru: d, yanlis: y, bos: b, net: computeNet(d, y) };
      }
      const weakTopicsList = weakInput
        .split(/[,;\n]/)
        .map((t) => t.trim())
        .filter(Boolean);
      await addExam({
        studentId: activeStudent.uid,
        teacherId: activeStudent.teacherId ?? profile!.uid,
        examType: activeStudent.targetGroup ?? "LGS",
        examName: examName.trim(),
        date: new Date(examDate),
        scores,
        totalNet: Math.round(totalNet * 100) / 100,
        weakTopics: weakTopicsList,
      });

      if (!isTeacher && activeStudent.teacherId) {
        createNotification({
          recipientId: activeStudent.teacherId,
          senderId: profile!.uid,
          senderName: profile!.displayName || "Öğrenci",
          title: "Yeni Deneme Sonucu 📊",
          body: `${profile!.displayName || "Öğrenciniz"} "${examName.trim()}" deneme sonucunu girdi (Net: ${Math.round(totalNet * 100) / 100}).`,
          link: "/panel/analiz",
        }).catch(() => {});
      } else if (isTeacher && activeStudent) {
        createNotification({
          recipientId: activeStudent.uid,
          senderId: profile!.uid,
          senderName: profile!.displayName || "Öğretmen",
          title: "Deneme Sonucunuz Girildi 📊",
          body: `Öğretmeniniz "${examName.trim()}" deneme sonucunuzu sisteme kaydetti (Net: ${Math.round(totalNet * 100) / 100}).`,
          link: "/panel/analiz",
        }).catch(() => {});
      }

      if (!isTeacher) {
        await touchStreak(profile!);
        refreshProfile();
      }
      setShowForm(false);
      setExamName("");
      setExamDate("");
      setWeakInput("");
      setInputs({});
    } finally {
      setSaving(false);
    }
  }

  const hasStudent = !isTeacher || !!selectedStudent;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Analiz</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          disabled={!hasStudent}
          className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus size={16} /> Deneme Ekle
        </button>
      </div>

      {isTeacher && (
        <div className="mt-4">
          <StudentPicker
            students={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
          />
        </div>
      )}

      {!hasStudent && (
        <Card className="mt-4">
          <p className="text-sm text-slate-500">Analizi görmek için öğrenci seçin.</p>
        </Card>
      )}

      {hasStudent && (
        <>
          {/* Öğrenci: hızlı soru girişi */}
          {!isTeacher && (
            <Card className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Bugün Kaç Soru Çözdün?
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-36 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Soru sayısı"
                  value={logCount}
                  onChange={(e) => setLogCount(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleLogQuestions}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Ekle
                </button>
              </div>
            </Card>
          )}

          {/* Haftalık soru çözüm grafiği */}
          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Haftalık Soru Çözümü
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Önceki hafta"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setWeekStart(mondayOf())}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Bu Hafta
              </button>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Sonraki hafta"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <Card className="mt-2">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-indigo-600">{weekTotal}</span>
              <span className="text-xs text-slate-400">soru bu hafta</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 4, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="soru" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Deneme net grafiği */}
          <SectionTitle title="Deneme Net Gelişimi" />
          <Card>
            {netChartData.length < 2 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Grafik için en az 2 deneme kaydı gerekli.
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netChartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Doğru / Yanlış / Boş analizi */}
          <SectionTitle title="Doğru / Yanlış / Boş Analizi" />
          <Card>
            {dybData.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Henüz deneme verisi yok.
              </p>
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dybData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                      >
                        {dybData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              entry.name === "Doğru"
                                ? DYB_COLORS[0]
                                : entry.name === "Yanlış"
                                  ? DYB_COLORS[1]
                                  : DYB_COLORS[2]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {dybPerExam.length >= 2 && (
                  <div className="mt-2 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dybPerExam} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="dogru" name="Doğru" stackId="a" fill={DYB_COLORS[0]} />
                        <Bar dataKey="yanlis" name="Yanlış" stackId="a" fill={DYB_COLORS[1]} />
                        <Bar dataKey="bos" name="Boş" stackId="a" fill={DYB_COLORS[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Hiç çalışılmayan konular */}
          <SectionTitle title="Konu Kapsamı" />
          <Card>
            {unstudiedTopics.length === 0 ? (
              <p className="py-4 text-center text-sm text-emerald-600">
                Tüm konularda en az bir çalışma kaydı var. 🎉
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500">
                  Program, soru kumbarası ve denemelerde hiç geçmeyen konular:
                </p>
                <div className="flex flex-wrap gap-2">
                  {topicActivity.map((t) => (
                    <span
                      key={t.topic}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        t.count === 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {t.topic}
                      {t.count === 0 ? " — hiç çalışılmadı" : ` (${t.count})`}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Anlaşılmayan konular */}
          <SectionTitle title="Anlaşılmayan Konular" />
          <Card>
            {weakTopics.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                Deneme girişlerinde işaretlenen konular burada birikecek.
              </p>
            ) : (
              <div className="space-y-2.5">
                {weakTopics.map((t) => (
                  <div key={t.topic}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{t.topic}</span>
                      <span className="font-semibold text-rose-500">
                        {t.count} denemede
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-rose-400"
                        style={{
                          width: `${Math.round((t.count / weakTopics[0].count) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Deneme ekleme formu */}
          {showForm && activeStudent && (
            <>
              <SectionTitle title="Yeni Deneme" />
              <Card className="space-y-3">
                <input
                  type="text"
                  placeholder="Deneme adı (örn. TYT Genel Deneme 5)"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_50px_50px_50px_48px] items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <span>Ders</span>
                    <span className="text-center">Doğru</span>
                    <span className="text-center">Yanlış</span>
                    <span className="text-center">Boş</span>
                    <span className="text-right">Net</span>
                  </div>
                  {subjects.map((s) => {
                    const d = parseInt(inputs[s]?.d ?? "", 10) || 0;
                    const y = parseInt(inputs[s]?.y ?? "", 10) || 0;
                    const has = inputs[s]?.d || inputs[s]?.y || inputs[s]?.b;
                    return (
                      <div
                        key={s}
                        className="grid grid-cols-[1fr_50px_50px_50px_48px] items-center gap-1.5"
                      >
                        <span className="truncate text-xs font-medium text-slate-600">{s}</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={inputs[s]?.d ?? ""}
                          onChange={(e) => setInput(s, "d", e.target.value)}
                          className="rounded-lg border border-slate-200 px-1 py-1.5 text-center text-sm outline-none focus:border-indigo-400"
                        />
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={inputs[s]?.y ?? ""}
                          onChange={(e) => setInput(s, "y", e.target.value)}
                          className="rounded-lg border border-slate-200 px-1 py-1.5 text-center text-sm outline-none focus:border-indigo-400"
                        />
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={inputs[s]?.b ?? ""}
                          onChange={(e) => setInput(s, "b", e.target.value)}
                          className="rounded-lg border border-slate-200 px-1 py-1.5 text-center text-sm outline-none focus:border-indigo-400"
                        />
                        <span className="text-right text-sm font-semibold text-indigo-600">
                          {has ? computeNet(d, y) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Anlamadığın konular (virgülle ayır: Türev, Paragraf...)"
                  value={weakInput}
                  onChange={(e) => setWeakInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                />
                <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2.5">
                  <span className="text-sm font-semibold text-indigo-700">Toplam Net</span>
                  <span className="text-lg font-bold text-indigo-700">
                    {Math.round(totalNet * 100) / 100}
                  </span>
                </div>
                <button
                  onClick={handleSaveExam}
                  disabled={saving}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Kaydediliyor..." : "Denemeyi Kaydet"}
                </button>
              </Card>
            </>
          )}

          {/* Geçmiş denemeler */}
          <SectionTitle title="Geçmiş Denemeler" />
          <div className="space-y-2">
            {[...exams].reverse().map((exam) => (
              <Card key={exam.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{exam.examName}</p>
                    <p className="text-xs text-slate-500">{formatDate(exam.date.toDate())}</p>
                  </div>
                  <span className="text-lg font-bold text-indigo-600">{exam.totalNet}</span>
                </div>
                {(exam.weakTopics?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {exam.weakTopics!.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
            {exams.length === 0 && (
              <Card>
                <p className="text-sm text-slate-500">Henüz deneme kaydı yok.</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
