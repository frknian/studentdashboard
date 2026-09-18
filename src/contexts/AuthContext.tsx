"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { KVKK_VERSION } from "@/lib/kvkk";
import type { Role, TargetGroup, UserProfile } from "@/lib/types";

export interface RegisterExtras {
  role: Role;
  displayName: string;
  targetGroup?: TargetGroup;
  grade?: number;
  teacherCode?: string;
  kvkkAccepted: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, extras: RegisterExtras) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  registerWithGoogle: (extras: RegisterExtras) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

async function createProfile(user: User, extras: RegisterExtras): Promise<void> {
  if (!extras.kvkkAccepted) {
    throw new Error("KVKK onayı olmadan kayıt oluşturulamaz.");
  }
  const profile: Record<string, unknown> = {
    uid: user.uid,
    role: extras.role,
    displayName: extras.displayName || user.displayName || "İsimsiz",
    email: user.email ?? "",
    kvkkAcceptedAt: serverTimestamp(),
    kvkkVersion: KVKK_VERSION,
    createdAt: serverTimestamp(),
  };
  if (extras.role === "STUDENT") {
    profile.targetGroup = extras.targetGroup ?? "LGS";
    profile.grade = extras.grade ?? 8;
    profile.teacherId = (extras.teacherCode ?? "").trim();
    profile.parentToken = crypto.randomUUID();
    profile.weeklyTarget = 0;
    profile.streak = 0;
    profile.lastActionDate = "";
  }
  await setDoc(doc(db(), "users", user.uid), profile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      if (u) {
        setProfile(await fetchProfile(u.uid));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth(), email, password);
  }, []);

  const register = useCallback(
    async (email: string, password: string, extras: RegisterExtras) => {
      const cred = await createUserWithEmailAndPassword(auth(), email, password);
      await createProfile(cred.user, extras);
      setProfile(await fetchProfile(cred.user.uid));
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth(), new GoogleAuthProvider());
    const existing = await fetchProfile(cred.user.uid);
    if (!existing) {
      await signOut(auth());
      throw new Error("NO_PROFILE");
    }
  }, []);

  const registerWithGoogle = useCallback(async (extras: RegisterExtras) => {
    const cred = await signInWithPopup(auth(), new GoogleAuthProvider());
    const existing = await fetchProfile(cred.user.uid);
    if (!existing) {
      await createProfile(cred.user, extras);
    }
    setProfile(await fetchProfile(cred.user.uid));
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth());
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) setProfile(await fetchProfile(user.uid));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        loginWithGoogle,
        registerWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalıdır.");
  return ctx;
}
