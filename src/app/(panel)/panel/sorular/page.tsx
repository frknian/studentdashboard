"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCheck,
  CheckCircle2,
  Edit3,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Card } from "@/components/ui";
import StudentPicker from "@/components/StudentPicker";
import UserAvatar from "@/components/UserAvatar";
import {
  deleteQuestionSolution,
  reopenQuestion,
  resolveQuestion,
  saveQuestionSolution,
  subscribeQuestions,
  uploadQuestion,
} from "@/lib/services/questions";
import { createNotification } from "@/lib/services/notifications";
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

  // Tam ekran fotoğraf görüntüleyici
  const [viewingImage, setViewingImage] = useState<{
    src: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Öğrenci soru yükleme formu state'leri
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Öğretmen çözüm yükleme modalı state'leri
  const [solutionModalQuestion, setSolutionModalQuestion] = useState<QuestionItem | null>(null);
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [solutionPreview, setSolutionPreview] = useState<string>("");
  const [solutionText, setSolutionText] = useState<string>("");
  const [savingSolution, setSavingSolution] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);
  const solutionFileInputRef = useRef<HTMLInputElement>(null);

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

      createNotification({
        recipientId: profile.teacherId,
        senderId: profile.uid,
        senderName: profile.displayName || "Öğrenci",
        title: "Soru Kumbarasına Yeni Soru ❓",
        body: `${profile.displayName || "Öğrenciniz"} yeni bir soru ekledi: ${topicLabel}`,
        link: "/panel/sorular",
      }).catch(() => {});

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

  function openSolutionModal(q: QuestionItem) {
    setSolutionModalQuestion(q);
    setSolutionFile(null);
    setSolutionPreview(q.solutionImageData || "");
    setSolutionText(q.solutionText || "");
    setSolutionError(null);
  }

  function handleSolutionFileChange(f: File | null) {
    setSolutionFile(f);
    if (f) {
      setSolutionPreview(URL.createObjectURL(f));
    }
    setSolutionError(null);
  }

  async function handleSaveSolution() {
    if (!solutionModalQuestion || !profile) return;
    if (!solutionFile && !solutionPreview && !solutionText.trim()) {
      setSolutionError("Lütfen bir çözüm fotoğrafı yükleyin veya çözüm notu yazın.");
      return;
    }
    setSavingSolution(true);
    setSolutionError(null);
    try {
      await saveQuestionSolution({
        questionId: solutionModalQuestion.id,
        solutionFile,
        solutionText,
        existingImageData: solutionPreview,
      });

      createNotification({
        recipientId: solutionModalQuestion.studentId,
        senderId: profile.uid,
        senderName: profile.displayName || "Öğretmeniniz",
        title: "Sorunuz Çözüldü! 🎯",
        body: `${solutionModalQuestion.topic} konulu sorunuz için öğretmeniniz çözüm ekledi.`,
        link: "/panel/sorular",
      }).catch(() => {});

      setSolutionModalQuestion(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Çözüm kaydedilirken bir hata oluştu.";
      setSolutionError(msg);
    } finally {
      setSavingSolution(false);
    }
  }

  async function handleDeleteSolution(questionId: string) {
    if (!confirm("Bu sorunun çözümünü kaldırmak ve soruyu tekrar açık duruma getirmek istiyor musunuz?")) {
      return;
    }
    try {
      await deleteQuestionSolution(questionId);
    } catch (err) {
      alert("Çözüm silinemedi: " + err);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Soru Kumbarası</h1>
      <p className="mt-1 text-sm text-slate-500">
        {isTeacher
          ? "Öğrencilerinizin takıldığı soruları inceleyin, fotoğraf veya açıklamalı çözüm yükleyin."
          : "Çözemediğin sorunun fotoğrafını çek, öğretmenin çözüm yüklesin veya derste birlikte çözün."}
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
          const hasSolution = !!(item.solutionImageData || item.solutionText);

          return (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Soru Fotoğrafı */}
                <button
                  type="button"
                  onClick={() =>
                    setViewingImage({
                      src: item.imageData,
                      title: `${item.topic} - Soru`,
                      subtitle: item.note || undefined,
                    })
                  }
                  className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
                  aria-label="Soruyu büyüt"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageData}
                    alt={item.topic}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10 hover:bg-black/20 transition-colors flex items-end justify-end p-1.5">
                    <ZoomIn
                      size={14}
                      className="text-white drop-shadow"
                    />
                  </div>
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
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Öğrenci notu:</span> {item.note}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                    {item.createdAt && (
                      <span>Soru Tarihi: {formatDateTime(item.createdAt.toDate())}</span>
                    )}
                  </div>

                  {/* Öğretmen Çözüm Kartı (Varsa) */}
                  {hasSolution && (
                    <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                          Öğretmenin Çözümü
                        </span>
                        {item.solvedAt && (
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                            {formatDateTime(item.solvedAt.toDate())}
                          </span>
                        )}
                      </div>

                      {item.solutionText && (
                        <p className="mt-1.5 whitespace-pre-wrap text-xs text-emerald-950 dark:text-emerald-100 font-medium">
                          {item.solutionText}
                        </p>
                      )}

                      {item.solutionImageData && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setViewingImage({
                                src: item.solutionImageData!,
                                title: `${item.topic} - Öğretmen Çözümü`,
                                subtitle: item.solutionText || undefined,
                              })
                            }
                            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-emerald-300/80 bg-white p-1 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.solutionImageData}
                              alt="Çözüm görseli"
                              className="h-14 w-14 rounded object-cover"
                            />
                            <span className="flex items-center gap-1 pr-2">
                              <ZoomIn size={14} />
                              Çözüm Fotoğrafını İncele
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Butonlar */}
                  <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {isTeacher ? (
                      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => openSolutionModal(item)}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                        >
                          {hasSolution ? <Edit3 size={14} /> : <Sparkles size={14} />}
                          {hasSolution ? "Çözümü Düzenle" : "Çözüm Yükle"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            item.status === "OPEN"
                              ? resolveQuestion(item.id)
                              : reopenQuestion(item.id)
                          }
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            item.status === "OPEN"
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
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

                        {hasSolution && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSolution(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto sm:ml-0"
                            title="Çözümü Sil"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ) : (
                      hasSolution && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={14} /> Öğretmeniniz çözümü yükledi
                        </span>
                      )
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

      {/* Öğretmen Çözüm Yükleme Modalı */}
      {solutionModalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Soru Çözümü Yükle
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSolutionModalQuestion(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Referans Soru Özeti */}
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={solutionModalQuestion.imageData}
                alt="Soru önizleme"
                className="h-14 w-14 rounded-lg object-cover shrink-0 cursor-pointer"
                onClick={() =>
                  setViewingImage({
                    src: solutionModalQuestion.imageData,
                    title: `${solutionModalQuestion.topic} - Soru`,
                    subtitle: solutionModalQuestion.note,
                  })
                }
                title="Büyütmek için tıkla"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {solutionModalQuestion.studentName || "Öğrenci Sorusu"}
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {solutionModalQuestion.topic}
                </p>
                {solutionModalQuestion.note && (
                  <p className="text-xs text-slate-500 truncate">
                    &quot;{solutionModalQuestion.note}&quot;
                  </p>
                )}
              </div>
            </div>

            {/* Gizli Çözüm Fotoğrafı Input */}
            <input
              ref={solutionFileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleSolutionFileChange(e.target.files?.[0] ?? null)}
            />

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Çözüm Fotoğrafı (Opsiyonel / Tavsiye Edilen)
                </label>
                {solutionPreview ? (
                  <div className="relative rounded-xl border border-slate-200 p-2 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={solutionPreview}
                      alt="Çözüm önizleme"
                      className="max-h-56 w-full rounded-lg object-contain bg-black/5"
                    />
                    <div className="mt-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => solutionFileInputRef.current?.click()}
                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                      >
                        Fotoğrafı Değiştir
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSolutionFile(null);
                          setSolutionPreview("");
                          if (solutionFileInputRef.current) solutionFileInputRef.current.value = "";
                        }}
                        className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => solutionFileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 py-6 text-indigo-600 hover:bg-indigo-50 transition-colors dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-400"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">
                      <Camera size={20} />
                    </div>
                    <span className="text-xs font-semibold">Çözümün Fotoğrafını Çek veya Galeriden Seç</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Çözüm Açıklaması / Cevap / Not
                </label>
                <textarea
                  rows={4}
                  placeholder="Çözümün adımlarını, püf noktasını veya doğru cevabı buraya yazabilirsiniz..."
                  value={solutionText}
                  onChange={(e) => setSolutionText(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {solutionError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{solutionError}</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSolutionModalQuestion(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveSolution}
                disabled={savingSolution}
                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {savingSolution ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {savingSolution ? "Kaydediliyor..." : "Çözümü Kaydet & Bildir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tam Ekran Fotoğraf Görüntüleyici (Soru veya Çözüm Görseli) */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
          onClick={() => setViewingImage(null)}
        >
          <div className="flex items-center justify-between text-white pb-2">
            <span className="font-semibold text-sm truncate pr-4">{viewingImage.title}</span>
            <button
              className="rounded-lg p-2 text-white hover:bg-white/10"
              onClick={() => setViewingImage(null)}
              aria-label="Kapat"
            >
              <X size={26} />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingImage.src}
              alt={viewingImage.title}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
          {viewingImage.subtitle && (
            <p className="py-3 text-center text-sm text-white/80 bg-black/40 rounded-lg mt-2 px-4 max-w-2xl mx-auto">
              {viewingImage.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

