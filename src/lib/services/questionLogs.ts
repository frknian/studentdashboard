import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { QuestionLog } from "@/lib/types";
import { dateKey } from "@/lib/utils";

export function subscribeQuestionLogs(
  studentId: string,
  cb: (logs: QuestionLog[]) => void
): () => void {
  const q = query(
    collection(db(), "question_logs"),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuestionLog));
  });
}

export async function addQuestionLog(data: {
  studentId: string;
  teacherId: string;
  date?: string;
  count: number;
}): Promise<void> {
  if (data.count <= 0) return;
  await addDoc(collection(db(), "question_logs"), {
    studentId: data.studentId,
    teacherId: data.teacherId,
    date: data.date ?? dateKey(),
    count: data.count,
    createdAt: serverTimestamp(),
  });
}
