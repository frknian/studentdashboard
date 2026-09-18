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
import imageCompression from "browser-image-compression";
import { db } from "@/lib/firebase";
import type { QuestionItem } from "@/lib/types";

export function subscribeQuestions(
  filter: { studentId: string } | { teacherId: string },
  cb: (items: QuestionItem[]) => void
): () => void {
  const q =
    "studentId" in filter
      ? query(collection(db(), "questions"), where("studentId", "==", filter.studentId))
      : query(collection(db(), "questions"), where("teacherId", "==", filter.teacherId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuestionItem);
    list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    cb(list);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fotoğrafı istemcide sıkıştırır ve base64 data URL olarak Firestore'a yazar.
 * (Cloud Storage gerektirmez; doküman 1MB sınırının çok altında kalır.)
 */
export async function uploadQuestion(data: {
  studentId: string;
  studentName?: string;
  studentAvatar?: string;
  teacherId: string;
  file: File;
  topic: string;
  note: string;
}): Promise<void> {
  const compressed = await imageCompression(data.file, {
    maxSizeMB: 0.12,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  const imageData = await blobToDataUrl(compressed);
  if (imageData.length > 900_000) {
    throw new Error("Fotoğraf çok büyük, lütfen daha küçük bir kare çekin.");
  }
  await addDoc(collection(db(), "questions"), {
    studentId: data.studentId,
    studentName: data.studentName || null,
    studentAvatar: data.studentAvatar || null,
    teacherId: data.teacherId,
    imageData,
    topic: data.topic,
    note: data.note,
    status: "OPEN",
    createdAt: serverTimestamp(),
  });
}

export async function resolveQuestion(questionId: string): Promise<void> {
  await updateDoc(doc(db(), "questions", questionId), { status: "RESOLVED" });
}

export async function reopenQuestion(questionId: string): Promise<void> {
  await updateDoc(doc(db(), "questions", questionId), { status: "OPEN" });
}
