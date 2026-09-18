import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TargetGroup, UserProfile } from "@/lib/types";
import { dateKey } from "@/lib/utils";

export function subscribeStudents(
  teacherId: string,
  cb: (students: UserProfile[]) => void
): () => void {
  const q = query(
    collection(db(), "users"),
    where("role", "==", "STUDENT"),
    where("teacherId", "==", teacherId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => d.data() as UserProfile);
    list.sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
    cb(list);
  });
}

export async function updateStudentSettings(
  uid: string,
  data: Partial<Omit<UserProfile, "uid" | "role" | "email" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db(), "users", uid), data);
}

/** Günlük seriyi (streak) günceller. Her gün en az bir aksiyon seriyi sürdürür. */
export async function touchStreak(profile: UserProfile): Promise<void> {
  const today = dateKey();
  if (profile.lastActionDate === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const streak =
    profile.lastActionDate === dateKey(yesterday) ? (profile.streak ?? 0) + 1 : 1;
  await updateDoc(doc(db(), "users", profile.uid), {
    streak,
    lastActionDate: today,
  });
}
