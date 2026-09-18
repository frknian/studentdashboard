"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-md ring-1 ring-slate-200">
            <Image
              src="/logo.png"
              alt="Öğrenci Takip Logo"
              width={64}
              height={64}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Kayıt Ol</h1>
            <p className="mt-0.5 text-xs text-slate-500">Öğretmen veya Öğrenci Hesabı Oluşturun</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(["STUDENT", "TEACHER"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                role === r ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
          />
          <input
            type="email"
            required
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Şifre (en az 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
              <p className="text-xs text-slate-400">
                Öğretmen kodunu öğretmeninizden alabilirsiniz.
              </p>
            </>
          )}

          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
            <input
              type="checkbox"
              checked={kvkkAccepted}
              onChange={(e) => setKvkkAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
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
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            Kayıt Ol
          </button>
        </form>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
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
    </div>
  );
}
