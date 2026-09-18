"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Image as ImageIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, ProgressBar, SectionTitle } from "@/components/ui";
import { fetchParentView } from "@/lib/services/parent";
import {
  PAYMENT_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  TARGET_GROUP_LABELS,
  type ParentView,
} from "@/lib/types";
import { getGradeLabel } from "@/lib/curriculum";

export default function ParentPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<ParentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchParentView(token)
      .then((v) => {
        if (v) {
          setView(v);
          localStorage.setItem("parentToken", token);
        } else setNotFound(true);
      })
      .catch((err) => {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: string }).code)
            : "";
        setError(code || "Bilinmeyen hata");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const nextLesson = useMemo(() => {
    if (!view) return null;
    const now = new Date();
    return (
      view.lessons.find(
        (l) => new Date(l.startTime) > now && l.status !== "CANCELLED"
      ) ?? null
    );
  }, [view]);

  const chartData = useMemo(
    () =>
      (view?.exams ?? []).map((e) => ({
        name: e.examName.length > 12 ? `${e.examName.slice(0, 12)}…` : e.examName,
        net: e.totalNet,
      })),
    [view]
  );

  const dybData = useMemo(() => {
    if (!view?.examTotals) return [];
    const { dogru, yanlis, bos } = view.examTotals;
    return [
      { name: "Doğru", value: dogru },
      { name: "Yanlış", value: yanlis },
      { name: "Boş", value: bos },
    ].filter((d) => d.value > 0);
  }, [view]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <GraduationCap className="text-slate-300" size={48} />
        <h1 className="text-lg font-bold">Bir Hata Oluştu</h1>
        <p className="text-sm text-slate-500">
          Veli özeti okunurken hata: <code className="font-mono">{error}</code>
        </p>
      </div>
    );
  }

  if (notFound || !view) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <GraduationCap className="text-slate-300" size={48} />
        <h1 className="text-lg font-bold">Bağlantı Geçersiz</h1>
        <p className="text-sm text-slate-500">
          Bu veli bağlantısı bulunamadı veya henüz özet oluşturulmamış. Lütfen
          öğretmeninizden güncel bağlantıyı isteyin.
        </p>
      </div>
    );
  }

  const paymentTone = (s: string) =>
    s === "PAID" ? ("green" as const) : s === "UNPAID" ? ("red" as const) : ("slate" as const);

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-slate-50 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            icon={view.avatarIcon}
            role="STUDENT"
            name={view.studentName}
            size="md"
          />
          <div>
            <p className="text-xs text-slate-500">Veli Bilgilendirme Ekranı</p>
            <h1 className="text-lg font-bold text-slate-800">{view.studentName}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {view.grade && (
                <span className="font-semibold text-indigo-600">
                  {getGradeLabel(view.grade)}
                </span>
              )}
              {view.schoolName && <span>• {view.schoolName}</span>}
            </div>
          </div>
        </div>
        {view.targetGroup && (
          <Badge tone="indigo">{TARGET_GROUP_LABELS[view.targetGroup]}</Badge>
        )}
      </header>

      {/* Takip Edilen Özel Dersler */}
      {view.enrolledSubjects && view.enrolledSubjects.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-indigo-50/60 p-2.5">
          <span className="text-[11px] font-semibold text-indigo-700">
            Takip Edilen Dersler:
          </span>
          {view.enrolledSubjects.map((subj) => (
            <span
              key={subj}
              className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-xs"
            >
              {subj}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-xl font-bold">{view.monthHours}</p>
          <p className="text-[11px] text-slate-500">Bu Ay Ders Saati</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-bold text-emerald-600">{view.monthPaidTotal}₺</p>
          <p className="text-[11px] text-slate-500">Ödenen</p>
        </Card>
        <Card className="text-center">
          <p className="text-xl font-bold text-rose-600">{view.monthUnpaidTotal}₺</p>
          <p className="text-[11px] text-slate-500">Ödeme Bekliyor</p>
        </Card>
      </div>

      <Card className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            Ödeme Takibi (Genel)
          </span>
          <span className="text-xs">
            <span className="font-bold text-emerald-600">
              {view.totalPaidAll ?? 0}₺ ödendi
            </span>
            {" • "}
            <span className="font-bold text-rose-600">
              {view.totalUnpaidAll ?? 0}₺ bekliyor
            </span>
          </span>
        </div>
      </Card>

      {nextLesson && (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sonraki Ders
          </p>
          <p className="mt-1 text-sm font-semibold">
            {new Date(nextLesson.startTime).toLocaleString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-xs text-slate-500">
            {nextLesson.subject} • {nextLesson.durationMinutes} dk
          </p>
        </Card>
      )}

      <SectionTitle title="Haftalık Ödev Durumu" />
      <Card>
        <div className="mb-2 flex items-end justify-between">
          <span className="text-sm text-slate-600">Çözülen soru</span>
          <span className="text-sm text-slate-500">
            <span className="text-lg font-bold text-indigo-600">
              {view.weeklyCompleted}
            </span>
            {" / "}
            {view.weeklyTarget || "—"}
          </span>
        </div>
        <ProgressBar
          value={view.weeklyCompleted}
          max={view.weeklyTarget || view.weeklyCompleted || 1}
        />
      </Card>

      {chartData.length >= 2 && (
        <>
          <SectionTitle title="Deneme Net Eğrisi" />
          <Card>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {(view.weeklyQuestions?.some((d) => d.count > 0) ?? false) && (
        <>
          <SectionTitle title="Haftalık Soru Çözümü" />
          <Card>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={view.weeklyQuestions!.map((d) => ({ day: d.day, soru: d.count }))}
                  margin={{ top: 4, right: 8, bottom: 0, left: -22 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="soru" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {dybData.length > 0 && (
        <>
          <SectionTitle title="Doğru / Yanlış / Boş Dağılımı" />
          <Card>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dybData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={62}
                    paddingAngle={3}
                  >
                    {dybData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "Doğru"
                            ? "#10b981"
                            : entry.name === "Yanlış"
                              ? "#f43f5e"
                              : "#94a3b8"
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {(view.weakTopics?.length ?? 0) > 0 && (
        <>
          <SectionTitle title="Tekrar Edilmesi Gereken Konular" />
          <Card>
            <div className="space-y-2.5">
              {view.weakTopics!.map((t) => (
                <div key={t.topic}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{t.topic}</span>
                    <span className="font-semibold text-rose-500">{t.count} denemede</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{
                        width: `${Math.round((t.count / view.weakTopics![0].count) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {(view.notes?.length ?? 0) > 0 && (
        <>
          <SectionTitle title="Öğretmen Mesajları" />
          <div className="space-y-2">
            {view.notes!.map((n, i) => (
              <Card key={i} className="border-l-4 border-l-indigo-400 py-3">
                <p className="text-sm text-slate-700">{n.text}</p>
                {n.date && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(n.date).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {(view.unstudiedTopics?.length ?? 0) > 0 && (
        <>
          <SectionTitle title="Henüz Çalışılmayan Konular" />
          <Card>
            <div className="flex flex-wrap gap-2">
              {view.unstudiedTopics!.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700"
                >
                  {t}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      {(view.materials?.length ?? 0) > 0 && (
        <>
          <SectionTitle title="Ders İçerikleri & Yapılanlar" />
          <div className="space-y-3">
            {view.materials!.map((m, i) => (
              <Card key={i} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{m.title}</p>
                    {m.date && (
                      <p className="text-[10px] text-slate-400">
                        {new Date(m.date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {m.description && (
                  <div className="mt-2 rounded-xl bg-slate-50 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Derste Yapılanlar / İşlenen Konu
                    </p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700">
                      {m.description}
                    </p>
                  </div>
                )}

                {m.driveLink && (
                  <div className="mt-2">
                    <a
                      href={m.driveLink.startsWith("http") ? m.driveLink : `https://${m.driveLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <ExternalLink size={13} /> Google Drive / Ders Materyalleri ↗
                    </a>
                  </div>
                )}

                {m.files && m.files.length > 0 ? (
                  <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Ekli Dosyalar:</p>
                    {m.files.map((f, fi) => (
                      <div key={fi} className="flex items-center justify-between text-xs text-slate-700 rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                          {f.kind === "pdf" ? <FileText size={14} className="text-rose-500" /> : <ImageIcon size={14} className="text-indigo-500" />}
                          <span className="truncate">{f.name}</span>
                        </span>
                        <a
                          href={f.dataUrl}
                          download={f.name}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                        >
                          <Download size={12} /> İndir
                        </a>
                      </div>
                    ))}
                  </div>
                ) : m.fileNames && m.fileNames.length > 0 ? (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Ekli Materyaller: {m.fileNames.join(", ")}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        </>
      )}

      {(view.tasks?.length ?? 0) > 0 && (
        <>
          <SectionTitle title="Haftalık Ödevler & Görevler" />
          <div className="space-y-3">
            {view.tasks!.map((t) => (
              <Card key={t.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={`text-sm font-bold ${t.isCompleted ? "text-emerald-700" : "text-slate-900"}`}>
                        {t.title}
                      </p>
                      {t.subject && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          {t.subject}
                        </span>
                      )}
                      {t.topic && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {t.topic}
                        </span>
                      )}
                    </div>
                    {t.dueDate && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                        <Clock size={11} /> Son Teslim: {new Date(t.dueDate).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                  </div>
                  <Badge tone={t.isCompleted ? "green" : "amber"}>
                    {t.isCompleted ? "Tamamlandı" : "Devam Ediyor"}
                  </Badge>
                </div>

                {t.description && (
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {t.description}
                  </p>
                )}

                {t.driveLink && (
                  <div className="mt-2">
                    <a
                      href={t.driveLink.startsWith("http") ? t.driveLink : `https://${t.driveLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      <ExternalLink size={12} /> Ödev / Kaynak Linki ↗
                    </a>
                  </div>
                )}

                <div className="mt-2.5">
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>Soru Çözümü</span>
                    <span>{t.completedQuestions} / {t.targetQuestions} soru</span>
                  </div>
                  <ProgressBar
                    value={t.completedQuestions}
                    max={t.targetQuestions || 1}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {(view.plans?.length ?? 0) > 0 && (
        <>
          <SectionTitle title="Çalışma Programı" />
          <div className="space-y-2">
            {view.plans!.map((p, i) => (
              <Card key={i} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className={`text-sm font-semibold ${
                        p.isCompleted ? "text-slate-400 line-through" : ""
                      }`}
                    >
                      {p.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {PLAN_TYPE_LABELS[p.type]} • {p.periodKey}
                      {p.targetQuestions > 0 && ` • Hedef: ${p.targetQuestions} soru`}
                    </p>
                    {p.isCompleted && (p.solvedQuestions || p.studentNote) && (
                      <p className="mt-1.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
                        {p.solvedQuestions ? `${p.solvedQuestions} soru çözüldü. ` : ""}
                        {p.studentNote}
                      </p>
                    )}
                  </div>
                  <Badge tone={p.isCompleted ? "green" : "amber"}>
                    {p.isCompleted ? "Tamamlandı" : "Bekliyor"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SectionTitle title="Öğretmen Notları" />
      <div className="space-y-2">
        {view.lessons
          .filter((l) => l.parentNote)
          .slice(0, 10)
          .map((l, i) => (
            <Card key={i} className="py-3">
              <p className="text-xs text-slate-400">
                {new Date(l.startTime).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                })}{" "}
                • {l.subject}
              </p>
              <p className="mt-1 text-sm text-slate-700">{l.parentNote}</p>
            </Card>
          ))}
        {view.lessons.filter((l) => l.parentNote).length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">Henüz öğretmen notu yok.</p>
          </Card>
        )}
      </div>

      <SectionTitle title="Ders ve Ödeme Geçmişi" />
      <div className="space-y-2">
        {view.lessons
          .filter((l) => l.status === "COMPLETED")
          .slice(0, 15)
          .map((l, i) => (
            <Card key={i} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold">{l.subject}</p>
                <p className="text-xs text-slate-500">
                  {new Date(l.startTime).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  • {l.durationMinutes} dk{l.price > 0 && ` • ${l.price}₺`}
                </p>
              </div>
              <Badge tone={paymentTone(l.paymentStatus)}>
                {PAYMENT_STATUS_LABELS[l.paymentStatus]}
              </Badge>
            </Card>
          ))}
        {view.lessons.filter((l) => l.status === "COMPLETED").length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">Tamamlanan ders bulunmuyor.</p>
          </Card>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] text-slate-400">
        Bu ekran salt okunurdur ve öğretmeniniz tarafından güncellenir.
        {view.updatedAt &&
          ` Son güncelleme: ${view.updatedAt
            .toDate()
            .toLocaleString("tr-TR")}`}
      </p>
    </div>
  );
}
