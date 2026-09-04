"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";

/**
 * Data My Company / My Branch — GET /api/v1/user/company.
 * Resolusi entity di backend: user = admin customers/surveyors (HO atau cabang).
 */

export interface CompanyEntity {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  type: "customer" | "surveyor" | "branch";
  parent_id?: number | null;
  is_active?: boolean;
  vat?: { npwp: string; name?: string | null } | null;
  province?: { id: number; name: string } | null;
  regency?: { id: number; name: string } | null;
  admin?: { id: number; name: string } | null;
}

export interface MyCompanyData {
  type: "customer" | "surveyor" | null;
  /** HO tempat user bernaung (row type customer/surveyor). */
  company: CompanyEntity | null;
  /** Posisi user: HO atau row cabang tempat user berada. */
  entity: { id: number; code: string; name: string; type: string; parent_id: number | null } | null;
  /** Cabang: semua anak HO (user di HO) atau row cabang user (user di cabang). */
  branches: CompanyEntity[];
}

export function useMyCompany() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["spine", "user-company", token],
    queryFn: async () => {
      const res = await api<MyCompanyData>("/api/v1/user/company");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data;
    },
    enabled: Boolean(token),
  });
}
