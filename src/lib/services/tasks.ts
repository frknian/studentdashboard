import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StudyTask, TaskFeedback } from "@/lib/types";

export function subscribeWeekTasks(
  studentId: string,
  week: string,
  cb: (tasks: StudyTask[]) => void
): () => void {
  const q = query(
    collection(db(), "tasks"),
    where("studentId", "==", studentId),
    where("week", "==", week)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyTask);
    list.sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));
    cb(list);
  });
}

export function subscribeAllTasksForStudent(
  studentId: string,
  cb: (tasks: StudyTask[]) => void
): () => void {
  const q = query(
    collection(db(), "tasks"),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StudyTask);
    cb(list);
  });
}

export async function addTask(data: {
  teacherId: string;
  studentId: string;
  week: string;
  title: string;
  subject?: string;
  topic?: string;
  description?: string;
  driveLink?: string;
  targetQuestions: number;
  dueDate: Date | null;
}): Promise<void> {
  await addDoc(collection(db(), "tasks"), {
    teacherId: data.teacherId,
    studentId: data.studentId,
    week: data.week,
    title: data.title,
    subject: data.subject || null,
    topic: data.topic || null,
    description: data.description || null,
    driveLink: data.driveLink?.trim() || null,
    targetQuestions: data.targetQuestions,
    completedQuestions: 0,
    dueDate: data.dueDate,
    isCompleted: false,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db(), "tasks", taskId));
}

export async function addTaskProgress(taskId: string, amount: number): Promise<void> {
  await updateDoc(doc(db(), "tasks", taskId), {
    completedQuestions: increment(amount),
  });
}

export async function completeTask(taskId: string, feedback: TaskFeedback): Promise<void> {
  await updateDoc(doc(db(), "tasks", taskId), {
    isCompleted: true,
    feedback,
  });
}

export async function uncompleteTask(taskId: string): Promise<void> {
  await updateDoc(doc(db(), "tasks", taskId), {
    isCompleted: false,
  });
}
