"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuth } from "@/core/auth/auth-context";

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
  postal_code?: string | null;
  nib?: string | null;
  vat?: {
    id: number;
    npwp: string;
    name?: string | null;
    address?: string | null;
    postal_code?: string | null;
    province_id?: number | null;
    regency_id?: number | null;
    owner_id?: number | null;
    province?: { id: number; name: string } | null;
    regency?: { id: number; name: string } | null;
  } | null;
  province?: { id: number; name: string } | null;
  regency?: { id: number; name: string } | null;
  admin?: { id: number; name: string } | null;
}

export interface MyCompanyData {
  type: "customer" | "surveyor" | null;
  /** Entity tempat user TERDAFTAR — HO atau cabang (bukan selalu HO). */
  company: CompanyEntity | null;
  /** Posisi user: HO atau row cabang tempat user berada. */
  entity: { id: number; code: string; name: string; type: string; parent_id: number | null } | null;
  /** Referensi kantor pusat (info saja) — ada kalau entity user adalah cabang. */
  parent_company: { id: number; code: string; name: string } | null;
  /** Cabang anak: terisi hanya kalau entity user adalah HO; cabang = kosong. */
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
