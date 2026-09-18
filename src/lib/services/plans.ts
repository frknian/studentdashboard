import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlanItem, PlanType } from "@/lib/types";

export function subscribePlans(
  studentId: string,
  cb: (plans: PlanItem[]) => void
): () => void {
  const q = query(collection(db(), "plans"), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlanItem);
    list.sort((a, b) => {
      if (a.periodKey !== b.periodKey) return a.periodKey.localeCompare(b.periodKey);
      return Number(a.isCompleted) - Number(b.isCompleted);
    });
    cb(list);
  });
}

export async function addPlan(data: {
  teacherId: string;
  studentId: string;
  type: PlanType;
  periodKey: string;
  title: string;
  subject?: string;
  topic?: string;
  targetQuestions: number;
}): Promise<void> {
  await addDoc(collection(db(), "plans"), {
    ...data,
    isCompleted: false,
    solvedQuestions: 0,
    studentNote: "",
    completedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function completePlan(
  planId: string,
  entry: { solvedQuestions: number; studentNote: string },
  logContext?: { studentId: string; teacherId: string }
): Promise<void> {
  await updateDoc(doc(db(), "plans", planId), {
    isCompleted: true,
    solvedQuestions: entry.solvedQuestions,
    studentNote: entry.studentNote,
    completedAt: serverTimestamp(),
  });
  // Çözülen sorular haftalık soru grafiğine de işlensin
  if (logContext && entry.solvedQuestions > 0) {
    const { addQuestionLog } = await import("./questionLogs");
    await addQuestionLog({
      studentId: logContext.studentId,
      teacherId: logContext.teacherId,
      count: entry.solvedQuestions,
    });
  }
}

export async function uncompletePlan(planId: string): Promise<void> {
  await updateDoc(doc(db(), "plans", planId), {
    isCompleted: false,
    completedAt: null,
  });
}

export async function deletePlan(planId: string): Promise<void> {
  await deleteDoc(doc(db(), "plans", planId));
}
