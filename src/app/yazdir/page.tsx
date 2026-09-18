"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import type { PlanItem, UserProfile } from "@/lib/types";
import { addDays, dateKey } from "@/lib/utils";

const DAY_NAMES_LONG = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
];

function PrintContent() {
  const params = useSearchParams();
  const studentId = params.get("ogrenci") ?? "";
  const weekParam = params.get("hafta") ?? "";
  const { profile, loading } = useAuth();

  const [student, setStudent] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  const weekStart = weekParam ? new Date(`${weekParam}T12:00:00`) : new Date();
  const weekKeyStr = dateKey(weekStart);

  useEffect(() => {
    if (loading || !profile || !studentId) return;
    (async () => {
      const isOwner = profile.uid === studentId;
      const isTeacher = profile.role === "TEACHER";
      if (!isOwner && !isTeacher) throw new Error("denied");
      const [userSnap, plansSnap] = await Promise.all([
        getDoc(doc(db(), "users", studentId)),
        getDocs(query(collection(db(), "plans"), where("studentId", "==", studentId))),
      ]);
      if (userSnap.exists()) setStudent(userSnap.data() as UserProfile);
      setPlans(plansSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlanItem));
      setReady(true);
    })().catch(() => setDenied(true));
  }, [loading, profile, studentId]);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (denied) {
    return <p className="p-8 text-center text-sm">Bu belgeye erişim yetkiniz yok.</p>;
  }
  if (!ready) {
    return <p className="p-8 text-center text-sm">Belge hazırlanıyor...</p>;
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekGoals = plans.filter(
    (p) => p.type === "WEEKLY" && p.periodKey === weekKeyStr
  );
  const itemsOf = (key: string) =>
    plans.filter((p) => p.type === "DAILY" && p.periodKey === key);

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-slate-900">
      <button
        onClick={() => window.print()}
        className="no-print mb-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
      >
        <Printer size={16} /> PDF Olarak Kaydet / Yazdır
      </button>

      <header className="border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold">Haftalık Çalışma Programı</h1>
        <p className="mt-1 text-sm text-slate-600">
          {student?.displayName ?? ""} •{" "}
          {weekStart.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
          {" — "}
          {addDays(weekStart, 6).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {weekGoals.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Haftalık Hedefler
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {weekGoals.map((g) => (
              <li key={g.id}>
                {g.title}
                {g.targetQuestions > 0 && ` (${g.targetQuestions} soru)`}
                {g.isCompleted && " ✓"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left">Gün</th>
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left">Çalışma</th>
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-center">Hedef</th>
            <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-center">Durum</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, i) => {
            const items = itemsOf(dateKey(day));
            if (items.length === 0) {
              return (
                <tr key={i}>
                  <td className="border border-slate-300 px-3 py-2 font-medium">
                    {DAY_NAMES_LONG[i]}
                    <span className="block text-xs text-slate-400">
                      {day.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </span>
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-400">—</td>
                  <td className="border border-slate-300 px-3 py-2" />
                  <td className="border border-slate-300 px-3 py-2" />
                </tr>
              );
            }
            return items.map((item, j) => (
              <tr key={`${i}-${j}`}>
                {j === 0 && (
                  <td
                    rowSpan={items.length}
                    className="border border-slate-300 px-3 py-2 font-medium align-top"
                  >
                    {DAY_NAMES_LONG[i]}
                    <span className="block text-xs text-slate-400">
                      {day.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </span>
                  </td>
                )}
                <td className="border border-slate-300 px-3 py-2">{item.title}</td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {item.targetQuestions > 0 ? `${item.targetQuestions} soru` : "—"}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-center">
                  {item.isCompleted ? "✓" : ""}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>

      <footer className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
        Öğrenci Takip Platformu • {new Date().toLocaleDateString("tr-TR")} tarihinde oluşturuldu
      </footer>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense
      fallback={<p className="p-8 text-center text-sm">Belge hazırlanıyor...</p>}
    >
      <PrintContent />
    </Suspense>
  );
}
