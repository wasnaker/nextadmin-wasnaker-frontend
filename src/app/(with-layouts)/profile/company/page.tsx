"use client";

import { Card } from "@/components/tailgrids/core/card";
import { StatusBadge } from "@/components/spine/status-badge";
import { useMyCompany, type CompanyEntity } from "../use-my-company";

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

function companyInfo(c: CompanyEntity) {
  const prov = c.province ? (c.regency ? `${c.province.name}, ${c.regency.name}` : c.province.name) : null;
  const rows: [string, React.ReactNode][] = [
    ["Code", <span key="c" className="font-mono">{c.code}</span>],
    ["Nama", c.name],
    ["Email", c.email ?? "—"],
    ["Telepon", c.phone ?? "—"],
    ["Alamat", c.address ?? "—"],
    ["NPWP", c.vat ? <span key="v" className="font-mono">{c.vat.npwp}{c.vat.name ? ` — ${c.vat.name}` : ""}</span> : "—"],
    ["Wilayah", prov ?? "—"],
    ["Status", <StatusBadge key="s" status={c.is_active ? "active" : "inactive"} />],
    ["Admin", c.admin?.name ?? "—"],
  ];
  return rows;
}

export default function MyCompanyPage() {
  const { data, isPending, error } = useMyCompany();

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-text-primary">My Company</h2>
        {entity && entity.type !== "branch" && (
          <span className="rounded-md bg-badge-primary-background px-2 py-0.5 text-xs font-medium text-badge-primary-text">
            Head Office
          </span>
        )}
      </div>

      {entity && entity.type === "branch" && (
        <p className="text-sm text-text-tertiary">
          Anda terdaftar di cabang{" "}
          <span className="font-medium text-text-primary">
            {entity.code} {entity.name}
          </span>{" "}
          — ini data HO tempat perusahaan Anda bernaung.
        </p>
      )}

      <Card className="p-5">
        <dl className="divide-y divide-border-primary">
          {companyInfo(company).map(([label, value]) => (
            <InfoRow key={label} label={label}>
              {value}
            </InfoRow>
          ))}
        </dl>
      </Card>
    </div>
  );
}
