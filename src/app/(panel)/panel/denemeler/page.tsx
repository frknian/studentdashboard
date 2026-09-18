"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExamsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/panel/analiz");
  }, [router]);
  return null;
}
