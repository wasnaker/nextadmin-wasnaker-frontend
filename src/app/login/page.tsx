"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginCard } from "@/components/spine/login-card";
import { useAuth } from "@/services/spine/auth-context";

/** Halaman login — tanpa shell (root layout only). */
export default function LoginPage() {
  const router = useRouter();
  const { token, ready, signIn } = useAuth();

  // Sudah login -> langsung ke depan.
  useEffect(() => {
    if (ready && token) router.replace("/");
  }, [ready, token, router]);

  if (ready && token) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoginCard
        desc="Login ke Spine — menu modul aktif baru muncul setelah masuk."
        onSuccess={async (t) => {
          await signIn(t);
          router.replace("/");
        }}
      />
    </div>
  );
}
