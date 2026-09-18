import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NoteAudience, NoteItem } from "@/lib/types";

export function subscribeNotes(
  studentId: string,
  cb: (notes: NoteItem[]) => void
): () => void {
  const q = query(collection(db(), "notes"), where("studentId", "==", studentId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as NoteItem);
    list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
    cb(list);
  });
}

export async function addNote(data: {
  teacherId: string;
  studentId: string;
  text: string;
  audience: NoteAudience;
}): Promise<void> {
  await addDoc(collection(db(), "notes"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db(), "notes", noteId));
}
