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
import imageCompression from "browser-image-compression";
import { db } from "@/lib/firebase";
import type { LessonMaterial, MaterialFile } from "@/lib/types";

const MAX_FILE_BYTES = 700_000; // Firestore 1MB doküman sınırına karşı güvenli pay

export function subscribeMaterialsForLesson(
  lessonId: string,
  cb: (items: LessonMaterial[]) => void
): () => void {
  const q = query(collection(db(), "materials"), where("lessonId", "==", lessonId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LessonMaterial);
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

async function fileToMaterialFile(file: File): Promise<MaterialFile> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" çok büyük (PDF için en fazla ~700KB).`);
    }
    return { name: file.name, kind: "pdf", dataUrl: await blobToDataUrl(file) };
  }
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" desteklenmiyor (yalnızca görsel veya PDF).`);
  }
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.12,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  return { name: file.name, kind: "image", dataUrl: await blobToDataUrl(compressed) };
}

export async function addMaterial(data: {
  teacherId: string;
  studentId: string;
  lessonId: string;
  title: string;
  description: string;
  driveLink?: string;
  files: File[];
}): Promise<void> {
  const files: MaterialFile[] = [];
  for (const f of data.files.slice(0, 5)) {
    files.push(await fileToMaterialFile(f));
  }
  const total = files.reduce((s, f) => s + f.dataUrl.length, 0);
  if (total > 900_000) {
    throw new Error("Dosyalar toplamda çok büyük; daha az veya daha küçük dosya seçin.");
  }
  await addDoc(collection(db(), "materials"), {
    teacherId: data.teacherId,
    studentId: data.studentId,
    lessonId: data.lessonId,
    title: data.title,
    description: data.description,
    driveLink: data.driveLink?.trim() || null,
    files,
    createdAt: serverTimestamp(),
  });
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await deleteDoc(doc(db(), "materials", materialId));
}
