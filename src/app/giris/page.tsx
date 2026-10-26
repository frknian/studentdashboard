"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { GraduationCap, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function extractToken(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/veli\/([A-Za-z0-9-]+)/);
  if (match) return match[1];
  return trimmed.replace(/\/+$/, "");
}

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"account" | "parent">("account");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [parentInput, setParentInput] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("parentToken") ?? "") : ""
  );
  const [parentError, setParentError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.replace("/panel");
    } catch {
      setError("Giriş başarısız. E-posta ve şifrenizi kontrol edin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle();
      router.replace("/panel");
    } catch (err) {
      if (err instanceof Error && err.message === "NO_PROFILE") {
        setError("Bu Google hesabıyla kayıt bulunamadı. Önce kayıt olun.");
      } else {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: string }).code)
            : "";
        const detail = err instanceof Error ? err.message : "";
        setError(`Google ile giriş başarısız oldu. ${code} ${detail}`.trim());
      }
    } finally {
      setBusy(false);
    }
  }

  function handleParentEnter(e: FormEvent) {
    e.preventDefault();
    const token = extractToken(parentInput);
    if (!token) {
      setParentError("Lütfen öğretmeninizden aldığınız veli kodunu girin.");
      return;
    }
    router.push(`/veli/${token}`);
  }

  return (
    <AuthShell title="Öğrenci Takip" subtitle="Özel ders takip ve koçluk platformu">
      <div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-200/60 p-1 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setTab("account")}
            className={`rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === "account" ? "bg-white text-indigo-600 shadow-sm dark:bg-[#1a1726] dark:text-indigo-300" : "text-slate-500"
            }`}
          >
            Öğretmen / Öğrenci
          </button>
          <button
            type="button"
            onClick={() => setTab("parent")}
            className={`rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === "parent" ? "bg-white text-indigo-600 shadow-sm dark:bg-[#1a1726] dark:text-indigo-300" : "text-slate-500"
            }`}
          >
            Veli Portalı
          </button>
        </div>

        {tab === "account" ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
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
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
              />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-2xl bg-indigo-600 py-4 text-[15px] font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-50"
              >
                Giriş Yap
              </button>
            </form>

            <button
              onClick={handleGoogle}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Google ile Giriş
            </button>

            <p className="mt-6 text-center text-sm text-slate-500">
              Hesabınız yok mu?{" "}
              <Link href="/kayit" className="font-semibold text-indigo-600">
                Kayıt Olun
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-3xl bg-indigo-50 p-5 text-center">
              <KeyRound className="mx-auto text-indigo-500" size={26} />
              <p className="mt-2 text-sm font-medium text-indigo-900">
                Hesap açmanıza gerek yok
              </p>
              <p className="mt-1 text-xs text-indigo-700/70">
                Öğretmenin paylaştığı veli bağlantısındaki kodu girin;
                öğrencinizin derslerini, programını, ödemelerini ve deneme
                sonuçlarını anlık takip edin.
              </p>
            </div>
            <form onSubmit={handleParentEnter} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Veli kodu veya bağlantısı"
                value={parentInput}
                onChange={(e) => {
                  setParentInput(e.target.value);
                  setParentError("");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none"
              />
              {parentError && <p className="text-sm text-rose-600">{parentError}</p>}
              <button
                type="submit"
                className="w-full rounded-2xl bg-indigo-600 py-4 text-[15px] font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
              >
                Öğrencimi Görüntüle
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-slate-400">
              Kodunuz yok mu? Öğretmeniniz Öğrenciler ekranındaki
              &quot;Veli Bağlantısı&quot; butonuyla size iletebilir.
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
