"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  subscribeLessonsForTeacher,
  updateLesson,
} from "@/lib/services/lessons";
import { refreshParentView } from "@/lib/services/parent";
import {
  PAYMENT_STATUS_LABELS,
  type Lesson,
} from "@/lib/types";
import { isSameMonth } from "@/lib/utils";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export default function FinancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [monthDate, setMonthDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (profile?.role === "STUDENT") router.replace("/panel");
  }, [profile, router]);

  useEffect(() => {
    if (!profile || profile.role !== "TEACHER") return;
    return subscribeLessonsForTeacher(profile.uid, setLessons);
  }, [profile]);

  const monthLessons = useMemo(
    () =>
      lessons.filter(
        (l) => isSameMonth(l.startTime.toDate(), monthDate) && l.status === "COMPLETED"
      ),
    [lessons, monthDate]
  );

  const totals = useMemo(() => {
    const paid = monthLessons
      .filter((l) => l.paymentStatus === "PAID")
      .reduce((s, l) => s + l.price, 0);
    const unpaid = monthLessons
      .filter((l) => l.paymentStatus === "UNPAID")
      .reduce((s, l) => s + l.price, 0);
    const hours =
      Math.round((monthLessons.reduce((s, l) => s + l.durationMinutes, 0) / 60) * 10) / 10;
    return { paid, unpaid, hours };
  }, [monthLessons]);

  const allTime = useMemo(() => {
    const completed = lessons.filter((l) => l.status === "COMPLETED");
    return {
      paid: completed
        .filter((l) => l.paymentStatus === "PAID")
        .reduce((s, l) => s + l.price, 0),
      unpaid: completed
        .filter((l) => l.paymentStatus === "UNPAID")
        .reduce((s, l) => s + l.price, 0),
    };
  }, [lessons]);

  if (!profile || profile.role !== "TEACHER") return null;

  async function togglePaid(lesson: Lesson) {
    const next = lesson.paymentStatus === "PAID" ? "UNPAID" : "PAID";
    await updateLesson(lesson.id, { paymentStatus: next });
    refreshParentView(lesson.studentId).catch(() => {});
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Finans / Tahsilat</h1>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() =>
            setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))
          }
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1e2a40]"
          aria-label="Önceki ay"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => setMonthDate(new Date())}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-[#1e2a40]"
        >
          {MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}
        </button>
        <button
          onClick={() =>
            setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))
          }
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1e2a40]"
          aria-label="Sonraki ay"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="text-center p-3">
          <p className="text-lg sm:text-xl font-bold text-emerald-600">{totals.paid}₺</p>
          <p className="text-[11px] text-slate-500">Tahsil Edilen (Ay)</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-lg sm:text-xl font-bold text-rose-600">{totals.unpaid}₺</p>
          <p className="text-[11px] text-slate-500">Bekleyen (Ay)</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-lg sm:text-xl font-bold text-indigo-600">{totals.hours}</p>
          <p className="text-[11px] text-slate-500">Ders Saati (Ay)</p>
        </Card>
      </div>

      <Card className="mt-3 text-center">
        <p className="text-xs text-slate-500">Genel Toplam (Tüm Zamanlar)</p>
        <p className="mt-1 text-sm">
          <span className="font-bold text-emerald-600">{allTime.paid}₺ tahsil edildi</span>
          {" • "}
          <span className="font-bold text-rose-600">{allTime.unpaid}₺ bekliyor</span>
        </p>
      </Card>

      <SectionTitle title={`Tamamlanan Dersler (${monthLessons.length})`} />
      <div className="space-y-2">
        {[...monthLessons].reverse().map((lesson) => (
          <Card key={lesson.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold">{lesson.studentName}</p>
              <p className="text-xs text-slate-500">
                {lesson.startTime.toDate().toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                })}{" "}
                • {lesson.subject} • {lesson.durationMinutes} dk
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lesson.price > 0 && (
                <span className="text-sm font-bold">{lesson.price}₺</span>
              )}
              <button
                onClick={() => togglePaid(lesson)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  lesson.paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                }`}
              >
                {PAYMENT_STATUS_LABELS[lesson.paymentStatus] || "Ödeme Bekliyor"}
              </button>
            </div>
          </Card>
        ))}
        {monthLessons.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">Bu ayda tamamlanan ders yok.</p>
          </Card>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Ödeme rozetine dokunarak Ödendi / Ödeme Bekliyor arasında geçiş yapabilirsiniz.
      </p>
    </div>
  );
}
