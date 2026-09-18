import type { Timestamp } from "firebase/firestore";

export type Role = "TEACHER" | "STUDENT";

export type TargetGroup = "LGS" | "YKS_SAY" | "YKS_EA" | "YKS_SOZ" | "ARA_SINIF";

export const TARGET_GROUP_LABELS: Record<TargetGroup, string> = {
  LGS: "LGS",
  YKS_SAY: "YKS Sayısal",
  YKS_EA: "YKS Eşit Ağırlık",
  YKS_SOZ: "YKS Sözel",
  ARA_SINIF: "Ara Sınıf",
};

export interface UserProfile {
  uid: string;
  role: Role;
  displayName: string;
  email: string;
  targetGroup?: TargetGroup;
  grade?: number; // 1-12
  enrolledSubjects?: string[]; // Öğrencinin özel ders aldığı / takip edilen dersler
  parentName?: string; // Veli adı soyadı
  parentPhone?: string; // Veli telefon numarası
  studentPhone?: string; // Öğrenci telefon numarası
  schoolName?: string; // Okul adı
  hourlyRate?: number; // Özel ders saatlik ücreti (TL)
  teacherId?: string;
  parentToken?: string;
  weeklyTarget?: number;
  streak?: number;
  lastActionDate?: string;
  avatarIcon?: string; // Özelleştirilebilir profil simgesi / avatar
  createdAt?: Timestamp;
}

export type LessonStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PAID" | "UNPAID" | "PACKAGE";

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  PENDING: "Onay Bekliyor",
  CONFIRMED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "Ödendi",
  UNPAID: "Ödeme Bekliyor",
  PACKAGE: "Paket",
};

export interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  startTime: Timestamp;
  durationMinutes: number;
  subject: string;
  status: LessonStatus;
  paymentStatus: PaymentStatus;
  price: number;
  parentNote?: string;
  proposedTime?: Timestamp | null;
}

export interface TaskFeedback {
  difficulty: number; // 1-5
  note: string;
}

export interface StudyTask {
  id: string;
  teacherId: string;
  studentId: string;
  week: string; // Pazartesi tarihi, örn. 2026-09-14
  title: string;
  subject?: string;
  topic?: string;
  description?: string; // Ödev detayları / yönergeler
  driveLink?: string; // Google Drive veya ödev linki
  targetQuestions: number;
  completedQuestions: number;
  dueDate: Timestamp | null;
  isCompleted: boolean;
  feedback?: TaskFeedback;
  createdAt?: Timestamp;
}

export interface QuestionItem {
  id: string;
  studentId: string;
  teacherId: string;
  imageData: string; // base64 data URL (Firestore'da saklanır)
  topic: string;
  note: string;
  status: "OPEN" | "RESOLVED";
  createdAt?: Timestamp;
}

export type PlanType = "DAILY" | "WEEKLY" | "MONTHLY";

export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  MONTHLY: "Aylık",
};

export interface PlanItem {
  id: string;
  teacherId: string;
  studentId: string;
  type: PlanType;
  periodKey: string; // DAILY: "2026-09-18" | WEEKLY: "2026-09-14" (Pazartesi) | MONTHLY: "2026-09"
  title: string; // çalışılacak konu / görev
  subject?: string; // ders (müfredattan)
  topic?: string; // konu (müfredattan)
  targetQuestions: number;
  isCompleted: boolean;
  solvedQuestions?: number; // öğrencinin gerçekte çözdüğü
  studentNote?: string; // öğrencinin notu (çalıştığı konu vb.)
  completedAt?: Timestamp | null;
  createdAt?: Timestamp;
}

export interface ParentPlanItem {
  title: string;
  type: PlanType;
  periodKey: string;
  targetQuestions: number;
  isCompleted: boolean;
  solvedQuestions?: number;
  studentNote?: string;
}

export interface SubjectScore {
  dogru: number;
  yanlis: number;
  bos?: number;
  net: number;
}

export interface ExamResult {
  id: string;
  studentId: string;
  teacherId: string;
  examType: string;
  examName: string;
  date: Timestamp;
  scores: Record<string, SubjectScore>;
  totalNet: number;
  weakTopics?: string[]; // anlaşılmayan konular
}

export type NoteAudience = "STUDENT" | "PARENT" | "BOTH";

export interface NoteItem {
  id: string;
  teacherId: string;
  studentId: string;
  text: string;
  audience: NoteAudience;
  createdAt?: Timestamp;
}

export interface MaterialFile {
  name: string;
  kind: "image" | "pdf";
  dataUrl: string; // base64
}

export interface LessonMaterial {
  id: string;
  teacherId: string;
  studentId: string;
  lessonId: string;
  title: string;
  description: string; // derste yapılanlar
  driveLink?: string; // Google Drive veya harici doküman linki
  files: MaterialFile[];
  createdAt?: Timestamp;
}

export interface QuestionLog {
  id: string;
  studentId: string;
  teacherId: string;
  date: string; // dateKey, örn. 2026-09-18
  count: number;
  createdAt?: Timestamp;
}

export interface WeakTopicStat {
  topic: string;
  count: number;
}

export interface ExamTotals {
  dogru: number;
  yanlis: number;
  bos: number;
}

export interface ParentLessonItem {
  startTime: string; // ISO
  durationMinutes: number;
  subject: string;
  status: LessonStatus;
  paymentStatus: PaymentStatus;
  price: number;
  parentNote?: string;
}

export interface ParentExamItem {
  examName: string;
  date: string; // ISO
  totalNet: number;
}

export interface ParentMaterialItem {
  id?: string;
  title: string;
  description: string;
  date: string;
  driveLink?: string;
  fileNames?: string[];
  files?: MaterialFile[];
}

export interface ParentTaskItem {
  id: string;
  title: string;
  subject?: string;
  topic?: string;
  description?: string;
  driveLink?: string;
  targetQuestions: number;
  completedQuestions: number;
  isCompleted: boolean;
  dueDate?: string;
}

export interface ParentView {
  token: string;
  studentId: string;
  teacherId: string;
  studentName: string;
  avatarIcon?: string;
  grade?: number;
  enrolledSubjects?: string[];
  schoolName?: string;
  targetGroup?: TargetGroup;
  weeklyCompleted: number;
  weeklyTarget: number;
  monthHours: number;
  monthPaidTotal: number;
  monthUnpaidTotal: number;
  totalPaidAll?: number;
  totalUnpaidAll?: number;
  lessons: ParentLessonItem[];
  exams: ParentExamItem[];
  plans?: ParentPlanItem[];
  weeklyQuestions?: { day: string; count: number }[];
  examTotals?: ExamTotals;
  weakTopics?: WeakTopicStat[];
  unstudiedTopics?: string[]; // hiç çalışılmayan konular
  notes?: { text: string; date: string }[]; // veliye yönelik öğretmen notları
  materials?: ParentMaterialItem[];
  tasks?: ParentTaskItem[];
  updatedAt?: Timestamp;
}
