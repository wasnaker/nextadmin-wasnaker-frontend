"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { useAuth } from "@/services/spine/auth-context";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { StatusBadge } from "@/components/spine/status-badge";
import { Button } from "@/components/tailgrids/core/button";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";

/**
 * SurveyorRegisterView — halaman Agency utk role surveyor (lintas dinas).
 * Daftar Disnaker (type=agency) memakai SmallTable standar; aksi "Register
 * Here" per baris (kolom aksi, pola Users). Status registrasi HO user tampil
 * sebagai badge. Dipilih otomatis oleh /agencies saat caller surveyor.
 */

interface DisnakerRow {
  id: number;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  province?: { id: number; name: string } | null;
  registration_status?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu review",
  review: "Perlu review ulang",
  approved: "Terdaftar",
  rejected: "Ditolak",
};

export default function SurveyorRegisterView() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "agencies", token],
    queryFn: async () => {
      const res = await api<{ data: DisnakerRow[] }>("/api/v1/agencies");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token),
  });

  async function onRegister(item: DisnakerRow) {
    setBusyId(item.id);
    setNotice(null);
    try {
      const res = await api(`/api/v1/agencies/${item.id}/surveyor-registration`, {
        method: "POST",
      });
      if (!res.ok) {
        setNotice(res.error ?? "Gagal mendaftar");
        return;
      }
      setNotice(`Registrasi ke ${item.name} terkirim — menunggu review Disnaker.`);
      await qc.invalidateQueries({ queryKey: ["spine", "agencies"] });
    } catch {
      setNotice("Gagal mendaftar");
    } finally {
      setBusyId(null);
    }
  }

  const columns: SmallTableColumn<DisnakerRow>[] = useMemo(
    () => [
      {
        key: "code",
        label: "Code",
        primary: true,
        render: (it) => (
          <span className="font-mono text-sm text-text-primary">{it.code}</span>
        ),
      },
      {
        key: "name",
        label: "Disnaker",
        primary: true,
        render: (it) => <span className="font-medium text-text-primary">{it.name}</span>,
      },
      {
        key: "province",
        label: "Provinsi",
        render: (it) => (
          <span className="text-text-secondary">{it.province?.name ?? "—"}</span>
        ),
      },
      {
        key: "phone",
        label: "Kontak",
        render: (it) => (
          <span className="text-text-tertiary">{it.phone ?? it.email ?? "—"}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (it) =>
          it.registration_status ? (
            <span className="flex items-center gap-2">
              <StatusBadge status={it.registration_status} />
              <span className="text-xs text-text-tertiary">
                {STATUS_LABEL[it.registration_status] ??
                  it.registration_status}
              </span>
            </span>
          ) : (
            <span className="text-xs text-text-tertiary">Belum terdaftar</span>
          ),
      },
      {
        key: "action",
        label: "",
        render: (it) =>
          !it.registration_status ? (
            <Button
              appearance="outline"
              size="sm"
              isDisabled={busyId !== null}
              onPress={() => onRegister(it)}
              className="h-7 px-2.5 text-xs"
            >
              {busyId === it.id ? "Mendaftar..." : "Register Here"}
            </Button>
          ) : null,
      },
    ],
    [busyId]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Daftar Disnaker
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Surveyor dapat bekerja lintas dinas — daftarkan perusahaan Anda ke
            Disnaker untuk mendapatkan kewenangan resmi di wilayahnya.
          </p>
        </div>
      </div>

      {notice && <p className="text-sm text-text-secondary">{notice}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={[]}
          columns={columns}
          selectedId={selectedId}
          onSelectId={(id) => setSelectedId(Number(id))}
          getItemId={(it) => it.id}
          showDetail={false}
          perPage={perPage}
          getSearchText={(it) =>
            `${it.code} ${it.name} ${it.province?.name ?? ""}`
          }
          emptyText="Belum ada Disnaker."
        />
      )}
    </div>
  );
}
