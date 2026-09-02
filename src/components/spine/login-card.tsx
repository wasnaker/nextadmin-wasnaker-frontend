"use client";

import { useState } from "react";
import { api } from "@/services/spine/api";
import { Button } from "@/components/tailgrids/core/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/tailgrids/core/card";
import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";

/** Kartu login Spine — dipakai halaman yang butuh token (sample, settings, ...). */
export function LoginCard({
  onSuccess,
  title = "Masuk",
  desc = "Login ke Spine untuk mengakses data.",
}: {
  onSuccess: (token: string) => void;
  title?: string;
  desc?: string;
}) {
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const res = await api<{ token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
    });
    if (!res.ok) {
      setError(res.error ?? "Login gagal");
      return;
    }
    onSuccess(res.data.token); // AuthProvider.signIn yang set token + validasi
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="mb-4">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <form onSubmit={onLogin}>
          <CardContent className="space-y-4">
            <div>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue="demo@spine.test"
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                defaultValue="password"
                className="mt-1.5 w-full"
              />
            </div>
            {error && <p className="text-sm text-text-tertiary">{error}</p>}
            <Button type="submit" className="w-full">
              Masuk
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
