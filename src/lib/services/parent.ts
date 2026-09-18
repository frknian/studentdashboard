import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  ExamResult,
  Lesson,
  LessonMaterial,
  NoteItem,
  ParentView,
  PlanItem,
  QuestionItem,
  QuestionLog,
  StudyTask,
  UserProfile,
} from "@/lib/types";
import { QUESTION_TOPICS } from "@/lib/examConfig";
import { getSubjects, getTopics } from "@/lib/curriculum";
import { addDays, dateKey, isSameMonth, mondayOf, weekKey } from "@/lib/utils";

/**
 * Veli görünümünü (salt okunur özet) yeniden hesaplar ve parentViews/{token}
 * dokümanına yazar. Öğretmen tarafındaki her önemli değişiklikten sonra çağrılır.
 */
export async function refreshParentView(studentId: string): Promise<void> {
  let userSnap;
  try {
    userSnap = await getDoc(doc(db(), "users", studentId));
  } catch {
    throw new Error("ADIM-1: Öğrenci profili okunamadı (users kuralı eksik)");
  }
  if (!userSnap.exists()) return;
  const student = userSnap.data() as UserProfile;
  if (!student.parentToken) return;

  // Bir koleksiyon izin hatası verse bile özet oluşturulabilsin diye
  // her sorgu ayrı ayrı hataya toleranslı çalışır.
  const safeGet = async (col: string, filters: [string, string][]) => {
    try {
      let q = query(collection(db(), col));
      for (const [field, value] of filters) {
        q = query(q, where(field, "==", value));
      }
      return await getDocs(q);
    } catch {
      return null;
    }
  };

  const [lessonsSnap, tasksSnap, examsSnap, plansSnap, logsSnap, notesSnap, materialsSnap, questionsSnap] =
    await Promise.all([
      safeGet("lessons", [["studentId", studentId]]),
      safeGet("tasks", [
        ["studentId", studentId],
        ["week", weekKey()],
      ]),
      safeGet("exam_results", [["studentId", studentId]]),
      safeGet("plans", [["studentId", studentId]]),
      safeGet("question_logs", [["studentId", studentId]]),
      safeGet("notes", [["studentId", studentId]]),
      safeGet("materials", [["studentId", studentId]]),
      safeGet("questions", [["studentId", studentId]]),
    ]);

  const mapDocs = <T,>(snap: typeof lessonsSnap): T[] =>
    snap ? snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T) : [];

  const lessons = mapDocs<Lesson>(lessonsSnap);
  const tasks = mapDocs<StudyTask>(tasksSnap);
  const exams = mapDocs<ExamResult>(examsSnap);
  const plans = mapDocs<PlanItem>(plansSnap);
  const logs = mapDocs<QuestionLog>(logsSnap);
  const notes = mapDocs<NoteItem>(notesSnap);
  const materials = mapDocs<LessonMaterial>(materialsSnap);
  const bankQuestions = mapDocs<QuestionItem>(questionsSnap);

  const now = new Date();
  const monthLessons = lessons.filter(
    (l) => isSameMonth(l.startTime.toDate(), now) && l.status === "COMPLETED"
  );
  const monthHours =
    Math.round(
      (monthLessons.reduce((sum, l) => sum + l.durationMinutes, 0) / 60) * 10
    ) / 10;
  const monthPaidTotal = monthLessons
    .filter((l) => l.paymentStatus === "PAID")
    .reduce((s, l) => s + l.price, 0);
  const monthUnpaidTotal = monthLessons
    .filter((l) => l.paymentStatus === "UNPAID")
    .reduce((s, l) => s + l.price, 0);

  const completedAll = lessons.filter((l) => l.status === "COMPLETED");
  const totalPaidAll = completedAll
    .filter((l) => l.paymentStatus === "PAID")
    .reduce((s, l) => s + l.price, 0);
  const totalUnpaidAll = completedAll
    .filter((l) => l.paymentStatus === "UNPAID")
    .reduce((s, l) => s + l.price, 0);

  lessons.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
  exams.sort((a, b) => a.date.toMillis() - b.date.toMillis());
  plans.sort((a, b) => b.periodKey.localeCompare(a.periodKey));

  // Haftalık soru çözümü (Pzt-Paz)
  const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const weekStart = mondayOf();
  const weeklyQuestions = DAY_NAMES.map((day, i) => {
    const key = dateKey(addDays(weekStart, i));
    const count = logs.filter((l) => l.date === key).reduce((s, l) => s + l.count, 0);
    return { day, count };
  });

  // Doğru / Yanlış / Boş toplamları
  let tDogru = 0,
    tYanlis = 0,
    tBos = 0;
  for (const exam of exams) {
    for (const s of Object.values(exam.scores)) {
      tDogru += s.dogru;
      tYanlis += s.yanlis;
      tBos += s.bos ?? 0;
    }
  }

  // Anlaşılmayan konular frekansı
  const freq = new Map<string, number>();
  for (const exam of exams) {
    for (const t of exam.weakTopics ?? []) {
      const key = t.trim();
      if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  const weakTopics = [...freq.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Hiç çalışılmayan konular (öğrencinin aldığı dersler ve sınıf müfredatı taranır)
  const studentSubs =
    student.enrolledSubjects && student.enrolledSubjects.length > 0
      ? student.enrolledSubjects
      : getSubjects(student.grade, student.targetGroup);

  const curriculumTopics: string[] = [];
  for (const s of studentSubs) {
    const ts = getTopics(s, student.grade, student.targetGroup);
    for (const t of ts) {
      if (!curriculumTopics.includes(t)) curriculumTopics.push(t);
    }
  }

  const group = student.targetGroup ?? "LGS";
  const allTopics =
    curriculumTopics.length > 0
      ? curriculumTopics
      : QUESTION_TOPICS[group].filter((t) => t !== "Diğer");

  const unstudiedTopics = allTopics.filter((topic) => {
    const needle = topic.toLocaleLowerCase("tr");
    const inQuestions = bankQuestions.some((q) =>
      q.topic.toLocaleLowerCase("tr").includes(needle)
    );
    const inPlans = plans.some((p) =>
      p.title.toLocaleLowerCase("tr").includes(needle)
    );
    const inExams = exams.some((e) =>
      Object.keys(e.scores).some((k) =>
        k.toLocaleLowerCase("tr").includes(needle)
      )
    );
    return !inQuestions && !inPlans && !inExams;
  }).slice(0, 12);

  // Veliye yönelik notlar
  notes.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  const parentNotes = notes
    .filter((n) => n.audience !== "STUDENT")
    .slice(0, 10)
    .map((n) => ({
      text: n.text,
      date: n.createdAt ? n.createdAt.toDate().toISOString() : "",
    }));

  // Ders içerikleri (yapılanlar, Google Drive linki, dosya özetleri)
  materials.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );
  let currentBytes = 0;
  const parentMaterials = materials.slice(0, 15).map((m) => {
    const safeFiles: typeof m.files = [];
    for (const f of m.files || []) {
      if (currentBytes + (f.dataUrl?.length ?? 0) < 400_000) {
        safeFiles.push(f);
        currentBytes += f.dataUrl?.length ?? 0;
      }
    }
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      date: m.createdAt ? m.createdAt.toDate().toISOString() : "",
      driveLink: m.driveLink || undefined,
      fileNames: (m.files || []).map((f) => f.name),
      files: safeFiles.length > 0 ? safeFiles : undefined,
    };
  });

  // Ödevler / Görevler (Veli takibi)
  const parentTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    subject: t.subject || undefined,
    topic: t.topic || undefined,
    description: t.description || undefined,
    driveLink: t.driveLink || undefined,
    targetQuestions: t.targetQuestions,
    completedQuestions: t.completedQuestions,
    isCompleted: t.isCompleted,
    dueDate: t.dueDate ? t.dueDate.toDate().toISOString() : undefined,
  }));

  const view: Omit<ParentView, "updatedAt"> = {
    token: student.parentToken,
    studentId,
    teacherId: student.teacherId ?? "",
    studentName: student.displayName,
    grade: student.grade,
    enrolledSubjects: studentSubs,
    schoolName: student.schoolName,
    targetGroup: student.targetGroup,
    weeklyCompleted: tasks.reduce((s, t) => s + t.completedQuestions, 0),
    weeklyTarget:
      student.weeklyTarget ?? tasks.reduce((s, t) => s + t.targetQuestions, 0),
    monthHours,
    monthPaidTotal,
    monthUnpaidTotal,
    totalPaidAll,
    totalUnpaidAll,
    lessons: lessons.slice(0, 40).map((l) => ({
      startTime: l.startTime.toDate().toISOString(),
      durationMinutes: l.durationMinutes,
      subject: l.subject,
      status: l.status,
      paymentStatus: l.paymentStatus,
      price: l.price,
      parentNote: l.parentNote ?? "",
    })),
    exams: exams.slice(-12).map((e) => ({
      examName: e.examName,
      date: e.date.toDate().toISOString(),
      totalNet: e.totalNet,
    })),
    plans: plans.slice(0, 30).map((p) => ({
      title: p.title,
      type: p.type,
      periodKey: p.periodKey,
      targetQuestions: p.targetQuestions,
      isCompleted: p.isCompleted,
      solvedQuestions: p.solvedQuestions ?? 0,
      studentNote: p.studentNote ?? "",
    })),
    weeklyQuestions,
    examTotals: { dogru: tDogru, yanlis: tYanlis, bos: tBos },
    weakTopics,
    unstudiedTopics,
    notes: parentNotes,
    materials: parentMaterials,
    tasks: parentTasks,
  };

  try {
    await setDoc(doc(db(), "parentViews", student.parentToken), {
      ...view,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error(
      "ADIM-2: parentViews yazılamadı (Firestore kuralları konsolda güncel değil)"
    );
  }
}

export async function fetchParentView(token: string): Promise<ParentView | null> {
  const snap = await getDoc(doc(db(), "parentViews", token));
  if (!snap.exists()) return null;
  return snap.data() as ParentView;
}
