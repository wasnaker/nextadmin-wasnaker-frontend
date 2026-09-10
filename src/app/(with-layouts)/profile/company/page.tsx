"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API_URL, getToken } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";
import { Card } from "@/components/tailgrids/core/card";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
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
import { StatusBadge } from "@/components/spine/status-badge";
import { useMyCompany, type CompanyEntity } from "../use-my-company";

/** Role admin entity yang berhak edit My Company (branch ataupun pusat). */
const ADMIN_ROLES = [
  "customer-admin",
  "customer-branch-admin",
  "surveyor-admin",
  "surveyor-branch-admin",
  "association-admin",
  "agency",
  "agency-unit-admin",
];

interface RegionOption {
  id: number;
  code: string;
  name: string;
}

/** Satu baris detail (label kiri, nilai kanan). */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5">
      <dt className="w-36 shrink-0 text-xs uppercase tracking-wider text-text-tertiary">
        {label}
      </dt>
      <dd className="text-sm text-text-primary">{children}</dd>
    </div>
  );
}

function companyInfo(c: CompanyEntity, isBranch: boolean, parentCompany: { code: string; name: string } | null) {
  const prov = c.province ? (c.regency ? `${c.province.name}, ${c.regency.name}` : c.province.name) : null;
  const vatProv = c.vat?.province ? (c.vat.regency ? `${c.vat.province.name}, ${c.vat.regency.name}` : c.vat.province.name) : null;
  const rows: [string, React.ReactNode][] = [
    ["Code", <span key="c" className="font-mono">{c.code}</span>],
    ["Nama", c.name],
    ["Email", c.email ?? "—"],
    ["Telepon", c.phone ?? "—"],
    ["Alamat", c.address ?? "—"],
    ["Kode Pos", c.postal_code ?? "—"],
    ["NIB", isBranch ? <span key="n" className="text-text-tertiary">mengikuti kantor pusat</span> : <span key="n" className="font-mono">{c.nib ?? "—"}</span>],
    ["NPWP", c.vat ? <span key="v" className="font-mono">{c.vat.npwp}{c.vat.name ? ` — ${c.vat.name}` : ""}</span> : "—"],
    ["Alamat NPWP", c.vat?.address ? <span key="a">{c.vat.address}{vatProv ? `, ${vatProv}` : ""}{c.vat.postal_code ? ` ${c.vat.postal_code}` : ""}</span> : "—"],
    ["Wilayah", prov ?? "—"],
    ["Status", <StatusBadge key="s" status={c.is_active ? "active" : "inactive"} />],
    ["Admin", c.admin?.name ?? "—"],
  ];
  // User cabang: referensi kantor pusat (info, read-only).
  if (isBranch) {
    rows.push([
      "Kantor Pusat",
      parentCompany
        ? <span key="p" className="font-mono">{parentCompany.code}</span>
        : <span key="p" className="text-text-tertiary">belum ada kantor pusat terdaftar</span>,
    ]);
    if (parentCompany) {
      rows.push(["", parentCompany.name]);
    }
  }
  return rows;
}

export default function MyCompanyPage() {
  const { data, isPending, error } = useMyCompany();
  const { user, token } = useAuth();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    address: string;
    postal_code: string;
    province_id: number | null;
    regency_id: number | null;
    nib: string;
    npwp: string;
    vatName: string;
    vatAddress: string;
    vatPostalCode: string;
    vatProvinceId: number | null;
    vatRegencyId: number | null;
  }>({
    name: "", email: "", phone: "", address: "", postal_code: "", province_id: null, regency_id: null, nib: "",
    npwp: "", vatName: "", vatAddress: "", vatPostalCode: "", vatProvinceId: null, vatRegencyId: null,
  });

  // Provinsi & kabupaten (entity + vat): pola useQuery (sama dgn agencies).
  const { data: provinces = [] } = useQuery({
    queryKey: ["region", "provinces", token],
    queryFn: async () => {
      const res = await api<{ data: RegionOption[] }>("/api/v1/provinces");
      return res.ok ? res.data.data : [];
    },
    enabled: Boolean(token) && open,
  });
  const { data: regencies = [] } = useQuery({
    queryKey: ["region", "regencies", form.province_id, token],
    queryFn: async () => {
      const res = await api<{ data: RegionOption[] }>(`/api/v1/regencies?province_id=${form.province_id}`);
      return res.ok ? res.data.data : [];
    },
    enabled: Boolean(token) && open && Boolean(form.province_id),
  });
  const { data: vatRegencies = [] } = useQuery({
    queryKey: ["region", "regencies", form.vatProvinceId, token],
    queryFn: async () => {
      const res = await api<{ data: RegionOption[] }>(`/api/v1/regencies?province_id=${form.vatProvinceId}`);
      return res.ok ? res.data.data : [];
    },
    enabled: Boolean(token) && open && Boolean(form.vatProvinceId),
  });

  if (isPending) return <p className="text-sm text-text-tertiary">Memuat...</p>;
  if (error) return <p className="text-sm text-text-tertiary">{String(error)}</p>;
  if (!data || !data.company) {
    return (
      <p className="text-sm text-text-tertiary">
        Akun ini tidak terikat ke company (customer/surveyor) mana pun.
      </p>
    );
  }

  const { company, entity } = data;
  const isBranch = entity?.type === "branch";
  const canEdit = (user?.access?.roles ?? []).some((r) => ADMIN_ROLES.includes(r));
  const vat = company.vat ?? null;
  const isVatOwner = !vat || !vat.owner_id || vat.owner_id === user?.id;

  function openEdit() {
    setForm({
      name: company.name ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      address: company.address ?? "",
      postal_code: company.postal_code ?? "",
      province_id: company.province?.id ?? null,
      regency_id: company.regency?.id ?? null,
      nib: company.nib ?? "",
      npwp: vat?.npwp ?? "",
      vatName: vat?.name ?? "",
      vatAddress: vat?.address ?? "",
      vatPostalCode: vat?.postal_code ?? "",
      vatProvinceId: vat?.province_id ?? null,
      vatRegencyId: vat?.regency_id ?? null,
    });
    setSaveError(null);
    setOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    const res = await api("/api/v1/user/company", {
      method: "PUT",
      body: JSON.stringify({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        province_id: form.province_id ?? null,
        regency_id: form.regency_id ?? null,
        ...(isBranch ? {} : { nib: form.nib || null }),
        // NPWP: siapa pun (HO/cabang) boleh set; data vat diatur pemiliknya.
        npwp: form.npwp || null,
        vat_name: form.vatName || null,
        vat_address: form.vatAddress || null,
        vat_province_id: form.vatProvinceId ?? null,
        vat_regency_id: form.vatRegencyId ?? null,
        vat_postal_code: form.vatPostalCode || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error ?? "Gagal menyimpan");
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["spine", "user-company"] });
  }

  async function onClaim() {
    setSaveError(null);
    setSaving(true);
    const res = await api("/api/v1/user/company/npwp-claim", { method: "POST" });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error ?? "Gagal klaim");
      return;
    }
    qc.invalidateQueries({ queryKey: ["spine", "user-company"] });
  }

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setSaveError(null);
    setSaving(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await api("/api/v1/user/company/npwp-file", { method: "POST", body: fd });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error ?? "Gagal upload file");
    }
  }

  async function onDownloadFile() {
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/user/company/npwp-file`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (!res.ok) {
        setSaveError("Belum ada file NPWP.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `npwp-${vat?.npwp ?? "file"}.${blob.type.includes("pdf") ? "pdf" : "jpg"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSaveError("Gagal mengunduh file NPWP.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-text-primary">My Company</h2>
        <span className="rounded-md bg-badge-primary-background px-2 py-0.5 text-xs font-medium text-badge-primary-text">
          {isBranch ? "Cabang" : "Head Office"}
        </span>
      </div>

      {isBranch && (
        <p className="text-sm text-text-tertiary">
          Anda terdaftar di cabang{" "}
          <span className="font-medium text-text-primary">
            {entity.code} {entity.name}
          </span>
          . Ini data cabang tempat Anda bekerja.
        </p>
      )}

      <Card className="p-5">
        <dl className="divide-y divide-border-primary">
          {companyInfo(company, isBranch, data.parent_company).map(([label, value]) => (
            <InfoRow key={label} label={label}>
              {value}
            </InfoRow>
          ))}
        </dl>
        {canEdit && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button appearance="outline" onClick={openEdit}>
              Edit
            </Button>
            {vat && !isVatOwner && (
              <Button appearance="outline" onClick={onClaim} isDisabled={saving}>
                Klaim Data NPWP
              </Button>
            )}
            {vat && (
              <Button appearance="outline" onClick={onDownloadFile} isDisabled={saving}>
                Lihat File NPWP
              </Button>
            )}
          </div>
        )}
      </Card>

      <Dialog isOpen={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Edit {isBranch ? "Cabang" : "Kantor Pusat"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave}>
          <DialogBody className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="c-name">Nama</FieldLabel>
              <Input id="c-name" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full" />
            </div>
            <div>
              <FieldLabel htmlFor="c-email">Email</FieldLabel>
              <Input id="c-email" name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full" />
            </div>
            <div>
              <FieldLabel htmlFor="c-phone">Telepon</FieldLabel>
              <Input id="c-phone" name="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 w-full" />
            </div>
            <div>
              <FieldLabel htmlFor="c-postal">Kode Pos</FieldLabel>
              <Input id="c-postal" name="postal_code" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="mis. 40286" className="mt-1.5 w-full" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="c-address">Alamat</FieldLabel>
              <Input id="c-address" name="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 w-full" />
            </div>
            {!isBranch && (
              <div>
                <FieldLabel htmlFor="c-nib">NIB</FieldLabel>
                <Input id="c-nib" name="nib" value={form.nib} onChange={(e) => setForm({ ...form, nib: e.target.value })} placeholder="13 digit" className="mt-1.5 w-full" />
              </div>
            )}
            <div>
              <FieldLabel>Provinsi</FieldLabel>
              <Select
                className="mt-1.5 w-full"
                placeholder="Pilih provinsi"
                aria-label="Provinsi"
                value={form.province_id != null ? String(form.province_id) : undefined}
                onChange={(k) => setForm({ ...form, province_id: Number(k), regency_id: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} id={String(p.id)} textValue={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Kabupaten/Kota</FieldLabel>
              <Select
                className="mt-1.5 w-full"
                placeholder={form.province_id ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}
                aria-label="Kabupaten/Kota"
                value={form.regency_id != null ? String(form.regency_id) : undefined}
                onChange={(k) => setForm({ ...form, regency_id: Number(k) })}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent>
                  {regencies.map((r) => (
                    <SelectItem key={r.id} id={String(r.id)} textValue={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border-primary pt-4 sm:col-span-2">
              <p className="mb-3 text-sm font-semibold text-text-primary">NPWP</p>
              {vat && !isVatOwner && (
                <p className="mb-2 text-xs text-text-tertiary">
                  Data NPWP dikelola pemilik lain. Klaim dulu untuk mengedit alamat NPWP.
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="c-npwp">NPWP</FieldLabel>
              <Input id="c-npwp" name="npwp" value={form.npwp} onChange={(e) => setForm({ ...form, npwp: e.target.value })} placeholder="mis. 00.000.000.0-000.000" className="mt-1.5 w-full" />
            </div>
            <div>
              <FieldLabel htmlFor="c-vatname">Nama NPWP</FieldLabel>
              <Input id="c-vatname" name="vat_name" value={form.vatName} onChange={(e) => setForm({ ...form, vatName: e.target.value })} className="mt-1.5 w-full" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="c-vataddress">Alamat NPWP</FieldLabel>
              <Input id="c-vataddress" name="vat_address" value={form.vatAddress} onChange={(e) => setForm({ ...form, vatAddress: e.target.value })} className="mt-1.5 w-full" />
            </div>
            <div>
              <FieldLabel>Provinsi NPWP</FieldLabel>
              <Select
                className="mt-1.5 w-full"
                placeholder="Pilih provinsi"
                aria-label="Provinsi NPWP"
                value={form.vatProvinceId != null ? String(form.vatProvinceId) : undefined}
                onChange={(k) => setForm({ ...form, vatProvinceId: Number(k), vatRegencyId: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} id={String(p.id)} textValue={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Kabupaten/Kota NPWP</FieldLabel>
              <Select
                className="mt-1.5 w-full"
                placeholder={form.vatProvinceId ? "Pilih kabupaten/kota" : "Pilih provinsi dulu"}
                aria-label="Kabupaten/Kota NPWP"
                value={form.vatRegencyId != null ? String(form.vatRegencyId) : undefined}
                onChange={(k) => setForm({ ...form, vatRegencyId: Number(k) })}
              >
                <SelectTrigger>
                  <SelectValue />
                  <SelectIndicator />
                </SelectTrigger>
                <SelectContent>
                  {vatRegencies.map((r) => (
                    <SelectItem key={r.id} id={String(r.id)} textValue={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="c-vatpostal">Kode Pos NPWP</FieldLabel>
              <Input id="c-vatpostal" name="vat_postal_code" value={form.vatPostalCode} onChange={(e) => setForm({ ...form, vatPostalCode: e.target.value })} className="mt-1.5 w-full" />
            </div>
            <div>
              <FieldLabel htmlFor="c-npwp-file">File NPWP (PDF/JPG/PNG, max 2MB)</FieldLabel>
              <Input
                id="c-npwp-file"
                name="npwp_file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={!isVatOwner}
                onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 w-full"
              />
            </div>

            {saveError && <p className="text-sm text-text-tertiary sm:col-span-2">{saveError}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" appearance="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isDisabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
