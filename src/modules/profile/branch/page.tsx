"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useMyCompany } from "../use-my-company";
import { useT } from "@/core/i18n";

export default function MyBranchPage() {
  const { data, isPending, error } = useMyCompany();
  const t = useT();

  if (isPending) return <p className="text-sm text-text-tertiary">{t("Loading...")}</p>;
  if (error) return <p className="text-sm text-text-tertiary">{String(error)}</p>;
  if (!data || !data.company) {
    return (
      <p className="text-sm text-text-tertiary">
        {t("This account is not linked to any company (customer/surveyor).")}
      </p>
    );
  }

  // User cabang: My Branch tidak berlaku (daftar cabang milik HO).
  if (data.entity?.type === "branch") {
    return (
      <p className="text-sm text-text-tertiary">
        {t("You are registered in branch")}{" "}
        <span className="font-medium text-text-primary">
          {data.entity.code} {data.entity.name}
        </span>
        {t("Branch list is only available for head office.")}
      </p>
    );
  }

  const branches = data.branches ?? [];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-text-primary">{t("My Branch")}</h2>
      <p className="text-sm text-text-tertiary">
        {t("Branches of")}{" "}
        <span className="font-medium text-text-primary">
          {data.company.code} {data.company.name}
        </span>
        {t("— total {count} branches.", { count: branches.length })}
      </p>

      {branches.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t("No branches yet.")}</p>
      ) : (
        <TableRoot className="rounded-lg border border-border-primary">
          <TableHeader>
            <TableRow className="[&_th]:border-t">
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                {t("Code")}
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                {t("Name")}
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                {t("Region")}
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                {t("Admin")}
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                {t("Status")}
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
