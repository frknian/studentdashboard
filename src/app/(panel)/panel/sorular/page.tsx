"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCheck,
  Loader2,
  RotateCcw,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Card } from "@/components/ui";
import StudentPicker from "@/components/StudentPicker";
import UserAvatar from "@/components/UserAvatar";
import {
  reopenQuestion,
  resolveQuestion,
  subscribeQuestions,
  uploadQuestion,
} from "@/lib/services/questions";
import { subscribeStudents, touchStreak } from "@/lib/services/users";
import { QUESTION_TOPICS } from "@/lib/examConfig";
import { getGradeLabel, getSubjects, getTopics } from "@/lib/curriculum";
import { formatDateTime } from "@/lib/utils";
import type { QuestionItem, UserProfile } from "@/lib/types";

export default function QuestionsPage() {
  const { profile, refreshProfile } = useAuth();
  const isTeacher = profile?.role === "TEACHER";

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [filter, setFilter] = useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");
  const [viewing, setViewing] = useState<QuestionItem | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (isTeacher) return subscribeStudents(profile.uid, setStudents);
  }, [profile, isTeacher]);

  useEffect(() => {
    if (!profile) return;
    if (isTeacher) {
      return subscribeQuestions({ teacherId: profile.uid }, setItems);
    }
    return subscribeQuestions({ studentId: profile.uid }, setItems);
  }, [profile, isTeacher]);

  const studentMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    students.forEach((s) => map.set(s.uid, s));
    return map;
  }, [students]);

  const studentSubjects = useMemo(() => {
    if (!profile) return [];
    if (profile.enrolledSubjects && profile.enrolledSubjects.length > 0) {
      return profile.enrolledSubjects;
    }
    return getSubjects(profile.grade, profile.targetGroup);
  }, [profile]);

  const activeSubject = selectedSubject || studentSubjects[0] || "Matematik";

  const availableTopics = useMemo(() => {
    if (!profile) return [];
    const list = getTopics(activeSubject, profile.grade, profile.targetGroup);
    return list.length > 0 ? list : QUESTION_TOPICS[profile.targetGroup ?? "LGS"];
  }, [activeSubject, profile]);

  if (!profile) return null;

  const visible = items.filter((i) => {
    const matchStatus = filter === "ALL" || i.status === filter;
    const matchStudent = !isTeacher || !selectedStudent || i.studentId === selectedStudent;
    return matchStatus && matchStudent;
  });

  function handleFileChange(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
    setUploadError(null);
  }

  async function handleUpload() {
    if (!file) return;
    if (!profile?.teacherId) {
      setUploadError(
        "Herhangi bir öğretmene bağlı değilsiniz. Sorunuzun öğretmeninize iletilebilmesi için lütfen önce Ayarlar sayfasından öğretmeninizin kodunu ekleyin."
      );
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const chosenTopic =
        topic === "__CUSTOM__"
          ? customTopic.trim()
          : topic || availableTopics[0] || "Genel";
      const topicLabel = `${activeSubject} - ${chosenTopic}`;

      await uploadQuestion({
        studentId: profile.uid,
        studentName: profile.displayName || "Öğrenci",
        studentAvatar: profile.avatarIcon || "",
        teacherId: profile.teacherId,
        file,
        topic: topicLabel,
        note,
      });
      await touchStreak(profile);
      refreshProfile();
      handleFileChange(null);
      setNote("");
      setTopic("");
      setCustomTopic("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Soru yüklenirken bir hata oluştu.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Soru Kumbarası</h1>
      <p className="mt-1 text-sm text-slate-500">
        {isTeacher
          ? "Öğrencilerin takıldığı soruları inceleyin, derste çözüldü olarak işaretleyin."
          : "Çözemediğin sorunun fotoğrafını çek, derste birlikte çözelim."}
      </p>

      {isTeacher && (
        <div className="mt-4">
          <StudentPicker
            students={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
            allowAll
            allLabel="Tüm Öğrenciler (Tüm Sorular)"
          />
        </div>
      )}

      {!isTeacher && !profile.teacherId && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Öğretmen Bağlantısı Bulunamadı</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Yüklediğiniz soruların öğretmeninize ulaşması için öğretmeninizin kodunu profilinize eklemelisiniz.
            </p>
            <Link
              href="/panel/ayarlar"
              className="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
            >
              Ayarlara Git & Kod Ekle
            </Link>
          </div>
        </div>
      )}

      {!isTeacher && (
        <Card className="mt-4 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {!preview ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-slate-400"
            >
              <Camera size={28} />
              <span className="text-sm font-medium">Fotoğraf Çek / Seç</span>
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Soru önizleme"
              className="max-h-64 w-full rounded-xl object-contain"
            />
          )}
          {file && (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-500">
                  Ders
                  <select
                    value={activeSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setTopic("");
                      setCustomTopic("");
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                  >
                    {studentSubjects.map((s: string) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-slate-500">
                  Konu
                  <select
                    value={topic || availableTopics[0]}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                  >
                    {availableTopics.map((t: string) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✏️ Özel Konu Yaz...</option>
                  </select>
                </label>
              </div>

              {topic === "__CUSTOM__" && (
                <input
                  type="text"
                  placeholder="Özel konu başlığı girin..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full rounded-xl border border-indigo-200 px-3 py-2 text-xs outline-none focus:border-indigo-400"
                />
              )}
              <input
                type="text"
                placeholder="Kısa not (isteğe bağlı)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {uploading && <Loader2 size={16} className="animate-spin" />}
                {uploading ? "Yükleniyor..." : "Kumbaraya Ekle"}
              </button>
            </>
          )}
        </Card>
      )}

      <div className="mt-5 flex gap-2">
        {(["OPEN", "RESOLVED", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {f === "OPEN" ? "Açık" : f === "RESOLVED" ? "Çözüldü" : "Tümü"}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {visible.map((item) => {
          const studentObj = isTeacher ? studentMap.get(item.studentId) : null;
          const studentName =
            item.studentName || studentObj?.displayName || (isTeacher ? "Öğrenci" : null);
          const studentAvatar = item.studentAvatar || studentObj?.avatarIcon;
          const studentGrade = studentObj?.grade
            ? getGradeLabel(studentObj.grade)
            : null;

          return (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex gap-3">
                <button
                  onClick={() => setViewing(item)}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
                  aria-label="Soruyu büyüt"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageData}
                    alt={item.topic}
                    className="h-full w-full object-cover"
                  />
                  <ZoomIn
                    size={14}
                    className="absolute bottom-1 right-1 text-white drop-shadow"
                  />
                </button>

                <div className="flex-1 min-w-0">
                  {/* Öğretmen Görünümünde Öğrenci Bilgisi */}
                  {isTeacher && (
                    <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
                      <UserAvatar
                        icon={studentAvatar}
                        name={studentName || "Öğrenci"}
                        role="STUDENT"
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {studentName}
                          </span>
                          {studentGrade && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {studentGrade}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                      {item.topic}
                    </p>
                    <Badge tone={item.status === "OPEN" ? "amber" : "green"}>
                      {item.status === "OPEN" ? "Açık" : "Çözüldü"}
                    </Badge>
                  </div>

                  {item.note && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {item.note}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    {item.createdAt && (
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(item.createdAt.toDate())}
                      </span>
                    )}

                    {isTeacher && (
                      <button
                        onClick={() =>
                          item.status === "OPEN"
                            ? resolveQuestion(item.id)
                            : reopenQuestion(item.id)
                        }
                        className={`ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                          item.status === "OPEN"
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {item.status === "OPEN" ? (
                          <>
                            <CheckCheck size={14} /> Çözüldü İşaretle
                          </>
                        ) : (
                          <>
                            <RotateCcw size={14} /> Yeniden Aç
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">
              {filter === "OPEN" ? "Açık soru bulunmuyor." : "Kayıt bulunmuyor."}
            </p>
          </Card>
        )}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
          onClick={() => setViewing(null)}
        >
          <button
            className="self-end p-2 text-white"
            onClick={() => setViewing(null)}
            aria-label="Kapat"
          >
            <X size={28} />
          </button>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewing.imageData}
              alt={viewing.topic}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
          <p className="py-3 text-center text-sm text-white/80">
            {viewing.topic}
            {viewing.note && ` — ${viewing.note}`}
          </p>
        </div>
      )}
    </div>
  );
}
