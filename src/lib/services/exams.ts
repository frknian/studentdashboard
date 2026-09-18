import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ExamResult, SubjectScore } from "@/lib/types";

export function subscribeExams(
  studentId: string,
  cb: (exams: ExamResult[]) => void
): () => void {
  const q = query(collection(db(), "exam_results"), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ExamResult);
    list.sort((a, b) => a.date.toMillis() - b.date.toMillis());
    cb(list);
  });
}

export async function addExam(data: {
  studentId: string;
  teacherId: string;
  examType: string;
  examName: string;
  date: Date;
  scores: Record<string, SubjectScore>;
  totalNet: number;
  weakTopics?: string[];
}): Promise<void> {
  await addDoc(collection(db(), "exam_results"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
