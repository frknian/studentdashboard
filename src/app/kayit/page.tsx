"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import KvkkModal from "@/components/KvkkModal";
import { TARGET_GROUP_LABELS, type Role, type TargetGroup } from "@/lib/types";
import { GRADE_CONFIGS, getSubjects, suggestGroup } from "@/lib/curriculum";

export default function RegisterPage() {
  const { register, registerWithGoogle } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [targetGroup, setTargetGroup] = useState<TargetGroup>("LGS");
  const [grade, setGrade] = useState(8);
  const [teacherCode, setTeacherCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [showKvkk, setShowKvkk] = useState(false);

  // Sınıfa göre grup
  const effectiveGroup: TargetGroup = grade < 8 ? "ARA_SINIF" : targetGroup;
  const extras = {
    role,
    displayName,
    targetGroup: effectiveGroup,
    grade,
    enrolledSubjects: getSubjects(grade, effectiveGroup),
    teacherCode,
    kvkkAccepted,
  };

  function validate(): string {
    if (!displayName.trim()) return "Lütfen adınızı girin.";
    if (role === "STUDENT" && !teacherCode.trim())
      return "Öğrenci kaydı için öğretmen kodu zorunludur.";
    if (!kvkkAccepted)
      return "Kayıt olmak için KVKK Aydınlatma Metni'ni onaylamanız gerekir.";
    return "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError("");
    setBusy(true);
    try {
      await register(email, password, extras);
      router.replace("/panel");
    } catch {
      setError("Kayıt başarısız. Bilgilerinizi kontrol edin (şifre en az 6 karakter).");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const v = validate();
    if (v) return setError(v);
    setError("");
    setBusy(true);
    try {
      await registerWithGoogle(extras);
      router.replace("/panel");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const detail = err instanceof Error ? err.message : "";
      setError(`Google ile kayıt başarısız oldu. ${code} ${detail}`.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Kayıt Ol" subtitle="Öğretmen veya öğrenci hesabı oluşturun">
      <div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/60 p-1 dark:bg-white/5">
          {(["STUDENT", "TEACHER"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                role === r ? "bg-white text-indigo-600 shadow-sm dark:bg-[#1a1726] dark:text-indigo-300" : "text-slate-500"
              }`}
            >
              {r === "STUDENT" ? "Öğrenciyim" : "Öğretmenim"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Ad Soyad"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
          />
          <input
            type="email"
            required
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Şifre (en az 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
          />

          {role === "STUDENT" && (
            <>
              <select
                value={grade}
                onChange={(e) => {
                  const g = parseInt(e.target.value, 10);
                  setGrade(g);
                  setTargetGroup(suggestGroup(g));
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    {GRADE_CONFIGS[g].gradeLabel} ({GRADE_CONFIGS[g].category})
                  </option>
                ))}
              </select>
              {grade >= 8 && (
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value as TargetGroup)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
                >
                  {Object.entries(TARGET_GROUP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                required
                placeholder="Öğretmen kodu"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
              />
              <p className="text-xs text-slate-400">
                Öğretmen kodunu öğretmeninizden alabilirsiniz.
              </p>
            </>
          )}

          <label className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5">
            <input
              type="checkbox"
              checked={kvkkAccepted}
              onChange={(e) => setKvkkAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-indigo-600"
            />
            <span className="text-xs text-slate-600">
              <button
                type="button"
                onClick={() => setShowKvkk(true)}
                className="font-semibold text-indigo-600 underline"
              >
                KVKK Aydınlatma Metni
              </button>
              &apos;ni okudum; kişisel verilerimin işlenmesine açık rıza veriyorum.
            </span>
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-indigo-600 py-4 text-[15px] font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-50"
          >
            Kayıt Ol
          </button>
        </form>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Google ile Kayıt
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="font-semibold text-indigo-600">
            Giriş Yapın
          </Link>
        </p>
      </div>
      {showKvkk && <KvkkModal onClose={() => setShowKvkk(false)} />}
    </AuthShell>
  );
}
