"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { StatusBadge } from "@/components/spine/status-badge";
import { useMyCompany } from "../use-my-company";

export default function MyBranchPage() {
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

  const branches = data.branches ?? [];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-text-primary">My Branch</h2>
      <p className="text-sm text-text-tertiary">
        Cabang dari{" "}
        <span className="font-medium text-text-primary">
          {data.company.code} {data.company.name}
        </span>
        {data.entity && data.entity.type === "branch"
          ? " — Anda terdaftar di cabang ini."
          : ` — total ${branches.length} cabang.`}
      </p>

      {branches.length === 0 ? (
        <p className="text-sm text-text-tertiary">Belum ada cabang.</p>
      ) : (
        <TableRoot className="rounded-lg border border-border-primary">
          <TableHeader>
            <TableRow className="[&_th]:border-t">
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Code
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Nama
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Wilayah
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Admin
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id} className="[&_td]:border-none">
                <TableCell className="px-4 py-2.5 font-mono text-sm text-text-primary">
                  {b.code}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-text-primary">
                  {b.name}
                  {b.phone ? (
                    <span className="block text-xs text-text-tertiary">
                      {b.phone}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-text-secondary">
                  {b.province
                    ? b.regency
                      ? `${b.province.name}, ${b.regency.name}`
                      : b.province.name
                    : "—"}
                </TableCell>
                <TableCell className="px-4 py-2.5 text-sm text-text-secondary">
                  {b.admin?.name ?? "—"}
                </TableCell>
                <TableCell className="px-4 py-2.5">
                  <StatusBadge
                    status={b.is_active ? "active" : "inactive"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableRoot>
      )}
    </div>
  );
}
