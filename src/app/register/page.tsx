"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api/client";
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
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";

interface EntityOption {
  id: number;
  type: string;
  code: string;
  name: string;
}

const TUJUAN_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "surveyor", label: "Surveyor" },
  { value: "association", label: "Asosiasi" },
  { value: "agency", label: "Agency" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "pusat", label: "Kantor Pusat" },
  { value: "cabang", label: "Cabang" },
];

const AGENCY_TYPE_OPTIONS = [
  { value: "induk", label: "Induk" },
  { value: "unit", label: "Unit" },
];

/** Halaman registrasi publik — tanpa shell (root layout only), pola login. */
export default function RegisterPage() {
  const [tujuan, setTujuan] = useState<string>("");
  const [customerType, setCustomerType] = useState<string>("");
  const [parentCustomerId, setParentCustomerId] = useState<string>("");
  const [agencyType, setAgencyType] = useState<string>("");
  const [parentAgencyId, setParentAgencyId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tahap 2: verifikasi kode
  const [step, setStep] = useState<"form" | "code">("form");
  const [regEmail, setRegEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(false); // cooldown 60s

  const needHoList = tujuan === "customer" && customerType === "cabang";
  const needIndukList = tujuan === "agency" && agencyType === "unit";

  const { data: hoList } = useQuery({
    queryKey: ["spine", "customers-ho"],
    queryFn: async () => {
      const res = await api<{ data: EntityOption[] }>("/api/v1/customers?type=customer");
      return res.ok ? res.data.data : [];
    },
    enabled: needHoList,
  });

  const { data: indukList } = useQuery({
    queryKey: ["spine", "agencies-induk"],
    queryFn: async () => {
      const res = await api<{ data: EntityOption[] }>("/api/v1/agencies");
      return res.ok ? res.data.data.filter((a) => a.type === "agency") : [];
    },
    enabled: needIndukList,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    setError(null);

    const body: Record<string, unknown> = {
      username: fd.get("username"),
      email: fd.get("email"),
      password: fd.get("password"),
      nama: fd.get("nama"),
      tujuan,
    };
    if (tujuan === "customer") {
      body.customer_type = customerType;
      if (customerType === "cabang" && parentCustomerId) {
        body.parent_customer_id = Number(parentCustomerId);
      }
    }
    if (tujuan === "agency") {
      body.agency_type = agencyType;
      if (agencyType === "unit" && parentAgencyId) {
        body.parent_agency_id = Number(parentAgencyId);
      }
    }

    setSubmitting(true);
    const res = await api("/api/v1/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error ?? "Pendaftaran gagal");
      return;
    }
    const data = res.data as { data?: { email?: string } };
    setRegEmail(data.data?.email ?? String(fd.get("email")));
    setStep("code");
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await api<{ message?: string }>("/api/v1/register/verify", {
      method: "POST",
      body: JSON.stringify({ email: regEmail, code }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Verifikasi gagal");
      return;
    }
    setSuccess(res.data?.message ?? "Registrasi berhasil. Akun aktif.");
  }

  async function onResend() {
    setError(null);
    const res = await api<{ message?: string }>("/api/v1/register/resend", {
      method: "POST",
      body: JSON.stringify({ email: regEmail }),
    });
    if (!res.ok) {
      setError(res.error ?? "Gagal kirim ulang kode");
      return;
    }
    setCode("");
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 60_000);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Registrasi berhasil</CardTitle>
            <CardDescription>{success}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/login"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              Silakan masuk
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="mb-4">
            <CardTitle>Verifikasi kode</CardTitle>
            <CardDescription>
              Kode 6 digit dikirim ke <span className="font-medium text-text-primary">{regEmail}</span>. Berlaku 15 menit.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onVerify}>
            <CardContent className="space-y-4">
              <div>
                <FieldLabel htmlFor="code">Kode Verifikasi</FieldLabel>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="mt-1.5 w-full text-center text-xl tracking-widest"
                />
              </div>
              {error && <p className="text-sm text-text-tertiary">{error}</p>}
              <Button type="submit" className="w-full" isDisabled={submitting}>
                {submitting ? "Memverifikasi..." : "Verifikasi & Aktifkan Akun"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={resendCooldown}
                  className="font-medium text-primary-600 hover:underline disabled:cursor-not-allowed disabled:text-text-tertiary"
                >
                  {resendCooldown ? "Kirim ulang (60 dtk)" : "Kirim ulang kode"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="font-medium text-text-tertiary hover:underline"
                >
                  Ubah data
                </button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="mb-4">
          <CardTitle>Daftar</CardTitle>
          <CardDescription>
            Buat akun baru. Kode verifikasi dikirim ke email Anda.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={64}
                autoComplete="username"
                placeholder="huruf kecil, tanpa spasi"
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
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
                minLength={8}
                autoComplete="new-password"
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel htmlFor="nama">Nama Perusahaan / Lembaga</FieldLabel>
              <Input
                id="nama"
                name="nama"
                type="text"
                required
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <FieldLabel>Tujuan Pendaftaran</FieldLabel>
              <Select
                className="mt-1.5 w-full"
                placeholder="Pilih tujuan"
                value={tujuan || undefined}
                onChange={(k) => {
                  setTujuan(String(k));
                  setCustomerType("");
                  setAgencyType("");
                  setParentCustomerId("");
                  setParentAgencyId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent>
                  {TUJUAN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} id={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tujuan === "customer" && (
              <>
                <div>
                  <FieldLabel>Tipe Customer</FieldLabel>
                  <Select
                    className="mt-1.5 w-full"
                    placeholder="Kantor Pusat / Cabang"
                    value={customerType || undefined}
                    onChange={(k) => {
                      setCustomerType(String(k));
                      setParentCustomerId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                      <SelectIndicator />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} id={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {needHoList && (
                  <div>
                    <FieldLabel htmlFor="parent_customer_id">
                      Kantor Pusat <span className="text-text-tertiary">(opsional, boleh kosong)</span>
                    </FieldLabel>
                    <Select
                      className="mt-1.5 w-full"
                      placeholder="Pilih kantor pusat"
                      value={parentCustomerId || undefined}
                      onChange={(k) => setParentCustomerId(String(k))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                        <SelectIndicator />
                      </SelectTrigger>
                      <SelectContent>
                        {(hoList ?? []).map((o) => (
                          <SelectItem key={o.id} id={String(o.id)}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {tujuan === "surveyor" && (
              <p className="text-sm text-text-tertiary">
                Surveyor terdaftar sebagai kantor pusat.
              </p>
            )}

            {tujuan === "agency" && (
              <>
                <div>
                  <FieldLabel>Tipe Agency</FieldLabel>
                  <Select
                    className="mt-1.5 w-full"
                    placeholder="Induk / Unit"
                    value={agencyType || undefined}
                    onChange={(k) => {
                      setAgencyType(String(k));
                      setParentAgencyId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                      <SelectIndicator />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENCY_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} id={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {needIndukList && (
                  <div>
                    <FieldLabel htmlFor="parent_agency_id">Induk</FieldLabel>
                    <Select
                      className="mt-1.5 w-full"
                      placeholder="Pilih induk"
                      value={parentAgencyId || undefined}
                      onChange={(k) => setParentAgencyId(String(k))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                        <SelectIndicator />
                      </SelectTrigger>
                      <SelectContent>
                        {(indukList ?? []).map((o) => (
                          <SelectItem key={o.id} id={String(o.id)}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm text-text-tertiary">{error}</p>}

            <Button type="submit" className="w-full" isDisabled={submitting}>
              {submitting ? "Mengirim..." : "Daftar"}
            </Button>

            <p className="text-sm text-text-tertiary">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-medium text-primary-600 hover:underline"
              >
                Masuk
              </Link>
            </p>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
