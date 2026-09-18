"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl shadow-md ring-1 ring-slate-200">
            <Image
              src="/logo.png"
              alt="Öğrenci Takip Logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Öğrenci Takip</h1>
            <p className="mt-0.5 text-sm text-slate-500">Özel ders takip ve koçluk platformu</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("account")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              tab === "account" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            Öğretmen / Öğrenci
          </button>
          <button
            type="button"
            onClick={() => setTab("parent")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              tab === "parent" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
              <input
                type="password"
                required
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                Giriş Yap
              </button>
            </form>

            <button
              onClick={handleGoogle}
              disabled={busy}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
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
            <div className="mb-4 rounded-2xl bg-indigo-50 p-4 text-center">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
              {parentError && <p className="text-sm text-rose-600">{parentError}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
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
    </div>
  );
}
