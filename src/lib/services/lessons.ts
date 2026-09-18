import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lesson, LessonStatus, PaymentStatus } from "@/lib/types";

function sortLessons(list: Lesson[]): Lesson[] {
  return list.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
}

export function subscribeLessonsForStudent(
  studentId: string,
  cb: (lessons: Lesson[]) => void
): () => void {
  const q = query(collection(db(), "lessons"), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    cb(sortLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson)));
  });
}

export function subscribeLessonsForTeacher(
  teacherId: string,
  cb: (lessons: Lesson[]) => void
): () => void {
  const q = query(collection(db(), "lessons"), where("teacherId", "==", teacherId));
  return onSnapshot(q, (snap) => {
    cb(sortLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson)));
  });
}

export function subscribeLessonsForTeacherAndStudent(
  teacherId: string,
  studentId: string,
  cb: (lessons: Lesson[]) => void
): () => void {
  const q = query(
    collection(db(), "lessons"),
    where("teacherId", "==", teacherId),
    where("studentId", "==", studentId)
  );
  return onSnapshot(q, (snap) => {
    cb(sortLessons(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson)));
  });
}

export async function addLesson(data: {
  teacherId: string;
  studentId: string;
  studentName: string;
  startTime: Date;
  durationMinutes: number;
  subject: string;
  price: number;
  paymentStatus: PaymentStatus;
}): Promise<void> {
  await addDoc(collection(db(), "lessons"), {
    teacherId: data.teacherId,
    studentId: data.studentId,
    studentName: data.studentName,
    startTime: data.startTime,
    durationMinutes: data.durationMinutes,
    subject: data.subject,
    status: "CONFIRMED" satisfies LessonStatus,
    paymentStatus: data.paymentStatus,
    price: data.price,
    proposedTime: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateLesson(
  lessonId: string,
  data: Partial<Pick<Lesson, "status" | "paymentStatus" | "parentNote" | "startTime" | "proposedTime" | "price">>
): Promise<void> {
  await updateDoc(doc(db(), "lessons", lessonId), data);
}
