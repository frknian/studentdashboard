"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  Link2,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  StickyNote,
  Trash2,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, SectionTitle, Badge } from "@/components/ui";
import UserAvatar from "@/components/UserAvatar";
import { subscribeStudents, updateStudentSettings } from "@/lib/services/users";
import { refreshParentView } from "@/lib/services/parent";
import { addNote, deleteNote, subscribeNotes } from "@/lib/services/notes";
import {
  GRADE_CONFIGS,
  getGradeLabel,
  getSubjects,
  suggestGroup,
} from "@/lib/curriculum";
import {
  TARGET_GROUP_LABELS,
  type NoteAudience,
  type NoteItem,
  type TargetGroup,
  type UserProfile,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import StudentDetailModal from "@/components/StudentDetailModal";

export default function StudentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteAudience, setNoteAudience] = useState<NoteAudience>("BOTH");
  const [notes, setNotes] = useState<Record<string, NoteItem[]>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  async function handleGradeChange(s: UserProfile, newGrade: number) {
    const suggested = suggestGroup(newGrade);
    const autoSubjects = getSubjects(newGrade, suggested);
    await updateStudentSettings(s.uid, {
      grade: newGrade,
      targetGroup: suggested,
      enrolledSubjects: autoSubjects,
    });
    refreshParentView(s.uid).catch(() => {});
  }

  async function handleGroupChange(s: UserProfile, newGroup: TargetGroup) {
    const autoSubjects = getSubjects(s.grade, newGroup);
    await updateStudentSettings(s.uid, {
      targetGroup: newGroup,
      enrolledSubjects: autoSubjects,
    });
    refreshParentView(s.uid).catch(() => {});
  }

  async function handleToggleSubject(s: UserProfile, subj: string) {
    const current = s.enrolledSubjects ?? getSubjects(s.grade, s.targetGroup);
    const exists = current.includes(subj);
    const next = exists ? current.filter((x) => x !== subj) : [...current, subj];
    await updateStudentSettings(s.uid, {
      enrolledSubjects: next,
    });
    refreshParentView(s.uid).catch(() => {});
  }

  async function handleSelectAllSubjects(s: UserProfile) {
    const all = getSubjects(s.grade, s.targetGroup);
    await updateStudentSettings(s.uid, {
      enrolledSubjects: all,
    });
    refreshParentView(s.uid).catch(() => {});
  }

  useEffect(() => {
    if (profile?.role === "STUDENT") router.replace("/panel");
  }, [profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "TEACHER") return;
    return subscribeStudents(profile.uid, setStudents);
  }, [profile]);

  useEffect(() => {
    if (!profile || profile.role !== "TEACHER" || students.length === 0) return;
    const unsubs = students.map((s) =>
      subscribeNotes(s.uid, (list) =>
        setNotes((prev) => ({ ...prev, [s.uid]: list }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [profile, students]);

  if (!profile || profile.role !== "TEACHER") return null;

  async function handleSendNote(studentId: string) {
    if (!noteText.trim()) return;
    await addNote({
      teacherId: profile!.uid,
      studentId,
      text: noteText.trim(),
      audience: noteAudience,
    });
    refreshParentView(studentId).catch(() => {});
    setNoteText("");
    setNoteFor(null);
  }

  async function handleDeleteNote(note: NoteItem) {
    await deleteNote(note.id);
    refreshParentView(note.studentId).catch(() => {});
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* pano erişimi yok */
    }
  }

  async function handleSync(studentId: string) {
    setSyncing(studentId);
    try {
      await refreshParentView(studentId);
      alert("Veli özeti güncellendi.");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      alert(`Özet oluşturulamadı: ${code || err}`);
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Öğrenciler</h1>

      <Card className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Öğretmen Kodunuz
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs">
            {profile.uid}
          </code>
          <button
            onClick={() => copy(profile.uid, "code")}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
          >
            {copied === "code" ? <Check size={14} /> : <Copy size={14} />}
            Kopyala
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Öğrenciler kayıt olurken bu kodu girer.
        </p>
      </Card>

      <SectionTitle title={`Kayıtlı Öğrenciler (${students.length})`} />
      <div className="space-y-3">
        {students.map((s) => {
          const availableSubjects = getSubjects(s.grade, s.targetGroup);
          const enrolled = s.enrolledSubjects ?? availableSubjects;
          const isExpanded = expandedStudent === s.uid;
          const cleanParentPhone = s.parentPhone?.replace(/\D/g, "");
          const cleanStudentPhone = s.studentPhone?.replace(/\D/g, "");

          return (
            <Card key={s.uid}>
              {/* Üst Kısım: Öğrenci Bilgisi ve Sınıf Rozeti */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <UserAvatar
                    icon={s.avatarIcon}
                    role="STUDENT"
                    name={s.displayName}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 dark:text-white">
                        {s.displayName}
                      </p>
                      {s.grade && (
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {getGradeLabel(s.grade)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{s.email}</p>
                    {s.schoolName && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        🏫 {s.schoolName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge tone="indigo">
                    {s.targetGroup ? TARGET_GROUP_LABELS[s.targetGroup] : "—"}
                  </Badge>
                  {s.hourlyRate ? (
                    <span className="text-[11px] font-medium text-emerald-600">
                      ₺{s.hourlyRate} / saat
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Takip Edilen Derslerin Kısa Özeti */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-400">
                  Dersler ({enrolled.length}):
                </span>
                {enrolled.slice(0, 4).map((sub) => (
                  <span
                    key={sub}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {sub}
                  </span>
                ))}
                {enrolled.length > 4 && (
                  <span className="text-[10px] font-medium text-indigo-500">
                    +{enrolled.length - 4} ders daha
                  </span>
                )}
              </div>

              {/* Kapsamlı Öğrenci Profili Butonu */}
              <button
                type="button"
                onClick={() => setSelectedDetailStudent(s)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
              >
                <User size={15} />
                Öğrenci Profili & Geçmişi (Ders Günleri, Konular, Ödemeler)
              </button>

              {/* Hızlı Aksiyon Butonları */}
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() =>
                    copy(`${window.location.origin}/veli/${s.parentToken}`, s.uid)
                  }
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copied === s.uid ? <Check size={14} /> : <Link2 size={14} />}
                  Veli Bağlantısı
                </button>
                <button
                  onClick={() => handleSync(s.uid)}
                  disabled={syncing === s.uid}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={syncing === s.uid ? "animate-spin" : ""}
                  />
                  Veli Özetini Yenile
                </button>
              </div>

              {/* Detayları Göster / Gizle Toggle Butonu */}
              <button
                type="button"
                onClick={() =>
                  setExpandedStudent(isExpanded ? null : s.uid)
                }
                className="mt-2.5 flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-indigo-500" />
                  Öğrenci & Özel Ders Detayları (1-12 Sınıf, Dersler, İletişim)
                </span>
                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {/* Genişletilmiş Öğrenci & Özel Ders Detay Paneli */}
              {isExpanded && (
                <div className="mt-3 space-y-3.5 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 dark:border-indigo-950 dark:bg-indigo-950/20">
                  {/* Sınıf, Grup ve Hedef Seçimi */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Sınıf Seviyesi (1-12)
                      <select
                        value={s.grade ?? 8}
                        onChange={(e) =>
                          handleGradeChange(s, parseInt(e.target.value, 10))
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                          <option key={g} value={g}>
                            {GRADE_CONFIGS[g].gradeLabel} ({GRADE_CONFIGS[g].category})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Hedef / Alan Grubu
                      <select
                        value={s.targetGroup ?? "LGS"}
                        onChange={(e) =>
                          handleGroupChange(s, e.target.value as TargetGroup)
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                      >
                        {Object.entries(TARGET_GROUP_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Haftalık Soru Hedefi
                      <input
                        type="number"
                        min={0}
                        defaultValue={s.weeklyTarget ?? 0}
                        onBlur={(e) =>
                          updateStudentSettings(s.uid, {
                            weeklyTarget: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                      />
                    </label>
                  </div>

                  {/* Takip Edilen / Özel Ders Alınan Dersler */}
                  <div className="rounded-lg bg-white p-2.5 dark:bg-[#151f31]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <BookOpen size={13} className="text-indigo-500" />
                        Takip Edilen Özel Dersler
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectAllSubjects(s)}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Tüm Sınıf Derslerini Seç
                      </button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Sınıf müfredatındaki dersler otomatik önerilir. Öğrencinin aldığı özel dersleri işaretleyin:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {availableSubjects.map((subj) => {
                        const isSelected = enrolled.includes(subj);
                        return (
                          <button
                            key={subj}
                            type="button"
                            onClick={() => handleToggleSubject(s, subj)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {subj}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Özel Ders & İletişim Bilgileri */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Veli Adı Soyadı
                      <input
                        type="text"
                        placeholder="Örn. Ayşe Yılmaz"
                        defaultValue={s.parentName ?? ""}
                        onBlur={(e) =>
                          updateStudentSettings(s.uid, {
                            parentName: e.target.value.trim(),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                      />
                    </label>

                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Veli Telefonu
                      </label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="tel"
                          placeholder="05xxxxxxxxx"
                          defaultValue={s.parentPhone ?? ""}
                          onBlur={(e) =>
                            updateStudentSettings(s.uid, {
                              parentPhone: e.target.value.trim(),
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                        />
                        {cleanParentPhone && (
                          <>
                            <a
                              href={`tel:${cleanParentPhone}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              title="Veliye Telefon Aç"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/90${cleanParentPhone.replace(/^0/, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Veliye WhatsApp Mesajı Gönder"
                            >
                              <MessageCircle size={13} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Okul Adı
                      <input
                        type="text"
                        placeholder="Örn. Atatürk Anadolu Lisesi"
                        defaultValue={s.schoolName ?? ""}
                        onBlur={(e) =>
                          updateStudentSettings(s.uid, {
                            schoolName: e.target.value.trim(),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                      />
                    </label>

                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Öğrenci Telefonu
                      </label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="tel"
                          placeholder="05xxxxxxxxx"
                          defaultValue={s.studentPhone ?? ""}
                          onBlur={(e) =>
                            updateStudentSettings(s.uid, {
                              studentPhone: e.target.value.trim(),
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                        />
                        {cleanStudentPhone && (
                          <>
                            <a
                              href={`tel:${cleanStudentPhone}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              title="Öğrenciyi Ara"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/90${cleanStudentPhone.replace(/^0/, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Öğrenciye WhatsApp Yaz"
                            >
                              <MessageCircle size={13} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Özel Ders Saat Ücreti (TL)
                      <div className="relative mt-1">
                        <Coins
                          size={13}
                          className="absolute left-2.5 top-2.5 text-slate-400"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="Örn. 750"
                          defaultValue={s.hourlyRate ?? ""}
                          onBlur={(e) =>
                            updateStudentSettings(s.uid, {
                              hourlyRate: parseInt(e.target.value, 10) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-[#151f31]"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              )}

            <button
              onClick={() => setNoteFor(noteFor === s.uid ? null : s.uid)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 py-2 text-xs font-semibold text-indigo-600"
            >
              <StickyNote size={14} /> Not Yaz
            </button>

            {noteFor === s.uid && (
              <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/60 p-1">
                  {(
                    [
                      ["STUDENT", "Öğrenciye"],
                      ["PARENT", "Veliye"],
                      ["BOTH", "İkisine"],
                    ] as [NoteAudience, string][]
                  ).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setNoteAudience(v)}
                      className={`rounded-md py-1.5 text-[11px] font-semibold transition ${
                        noteAudience === v
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  placeholder="Notunuzu yazın..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => handleSendNote(s.uid)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white"
                >
                  <Send size={13} /> Gönder
                </button>
              </div>
            )}

            {(notes[s.uid]?.length ?? 0) > 0 && (
              <div className="mt-3 space-y-1.5">
                {notes[s.uid].slice(0, 3).map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
                  >
                    <div className="flex-1">
                      <p className="text-xs text-slate-700">{n.text}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {n.audience === "STUDENT"
                          ? "Öğrenciye"
                          : n.audience === "PARENT"
                            ? "Veliye"
                            : "Öğrenci + Veli"}
                        {n.createdAt &&
                          ` • ${n.createdAt.toDate().toLocaleDateString("tr-TR")}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(n)}
                      className="p-1 text-slate-300 hover:text-rose-500"
                      aria-label="Notu sil"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          );
        })}
        {students.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">
              Henüz öğrenci kaydı yok. Yukarıdaki kodu öğrencinizle paylaşın.
            </p>
          </Card>
        )}
      </div>

      {selectedDetailStudent && (
        <StudentDetailModal
          student={selectedDetailStudent}
          teacherId={profile.uid}
          onClose={() => setSelectedDetailStudent(null)}
          onStudentRemoved={() => {
            setSelectedDetailStudent(null);
            setStudents((prev) => prev.filter((st) => st.uid !== selectedDetailStudent.uid));
          }}
        />
      )}
    </div>
  );
}
