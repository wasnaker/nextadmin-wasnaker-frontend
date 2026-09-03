# SmallTable Module Scaffolding Pattern

> Pola yang diikuti oleh halaman modul di `wasnaker-frontend/src/app/(with-layouts)/`
> yang menggunakan `SmallTable` + panel detail bertab (tanpa framework generate,
> cukup copy-paste + edit per-module).

---

## 1. Struktur file minimal

```
src/app/(with-layouts)/<plural-name>/page.tsx   ← satu file: list + dialog form
```

Contoh nyata:
- `src/app/(with-layouts)/customers/page.tsx`
- `src/app/(with-layouts)/vats/page.tsx`
- `src/app/(with-layouts)/sample/page.tsx` (boilerplate Spine)
- `src/app/(with-layouts)/sample-tasks/page.tsx`
- `src/app/(with-layouts)/region/page.tsx`
- `src/app/(with-layouts)/users/page.tsx`

**Tidak perlu folder berdiri sendiri.** Semua logika untuk satu modul bisa di satu
file (IRS `page.tsx`). Jika terlalu besar (> 500 baris), pisah jadi:

```
src/app/(with-layouts)/<plural-name>/
  page.tsx                        ← layout + query + handler
  <plural-name>-form.tsx          ← dialog edit/create (murni presentasi)
  <plural-name>-columns.ts        ← array SmallTableColumn (murni presentasi)
  <plural-name>.ts                ← interface + konstanta (opsional)
```

---

## 2. Pola SmallTable: visibility panel detail

PANCIPAN PENTING — ini beda dari approach awal & sumber banyak bug:

- **State `showDetail` HARUS ada di parent page, bukan di SmallTable.**
  SmallTable hanya menerima prop `showDetail?: boolean` dan merender panel
  detail kalau `selected != null && showDetail == true`.
- **Tombol toggle ◀/▶ HARUS ada di parent** — masukkan ke `toolbar` prop
  (dipanggil oleh SmallTable di header detail panel), atau letakkan di luar
  SmallTable (mis. samping tombol "Add").
- **Klik row HARUS auto-expand.** Di handler `onSelectId` (parent),
  panggil `setShowDetail(true)` setelah pilih record.

Contoh pola standard (lihat `sample/page.tsx`):

```tsx
// 1. State di parent
const [smallView, setSmallView] = useState(true);

// 2. Klik row handler → include setSmallView(true)
function selectItem(id: number | string) {
  const n = Number(id);
  setSelectedId(n);
  window.location.hash = String(n);
  setSmallView(true);          // ← KUNCI: auto-expand saat klik row
}

// 3. Render
<SmallTable
  items={items}
  tabs={tabs}
  columns={columns}
  selectedId={selectedId}
  onSelectId={selectItem}      // ← parent handler yang include setSmallView
  getItemId={(it) => it.id}
  showDetail={smallView}       // ← PROP dari parent state, bukan state internal
  ...
  toolbar={(item) => (         // ← tombol toggle ◀/▶ di toolbar prop
    <Button appearance="outline" onClick={() => setSmallView((v) => !v)}>
      {smallView ? "◀" : "▶"}
    </Button>
  )}
/>
```

---

## 3. Pola auth & gate

Gunakan hook `useAuth` + fungsi `can`:

```tsx
import { useAuth } from "@/services/spine/auth_context";
import { can } from "@/services/spine/auth_context";   // atau export bersamaan

const { token, user: me } = useAuth();
const canView = can(me, "<entity>:view");
const canCreate = can(me, "<entity>:create");
const canEdit = can(me, "<entity>:edit");
const canDelete = can(me, "<entity>:delete");

// Kembali ke login kalau belum authenticated
useEffect(() => {
  if (ready && !token) router.replace("/login");
}, [ready, token, router]);
```

Permission names biasakan: `<plural-lowercase>:view`, `<plural-lowercase>:create`,
`<plural-lowercase>:edit`, `<plural-lowercase>:delete`.

---

## 4. Pola data fetching

Pakai TanStack Query (React Query v5):

```tsx
const { data: items = [], isPending } = useQuery({
  queryKey: ["spine", "<plural-lowercase>", token],
  queryFn: async () => {
    const res = await api<{ data: <Entity>[] }>("/api/v1/<plural-lowercase>");
    if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
    return res.data?.data ?? [];
  },
  enabled: Boolean(token) && canView,
});
```

Jika perlu `refetch` / invalidate setelah create/update/delete, panggil:

```tsx
await qc.invalidateQueries({ queryKey: ["spine", "<plural-lowercase>"] });
```

---

## 5. Pola form dialog

Gunakan `Dialog` dari `@/components/tailgrids/core/dialog`. Struktur:

```tsx
const EMPTY_FORM: <FormType> = { ... };   // field kosong sesuai entity

const [open, setOpen] = useState(false);
const [editing, setEditing] = useState<<Entity> | null>(null);
const [form, setForm] = useState(EMPTY_FORM);
const [error, setError] = useState<string | null>(null);
const [saving, setSaving] = useState(false);

// Handler buka
function openCreate() {
  setEditing(null);
  setForm(EMPTY_FORM);
  setError(null);
  setOpen(true);
}
function openEdit(item: <Entity>) {
  setEditing(item);
  setForm({ ...mapToForm(item) });
  setError(null);
  setOpen(true);
}

// Handler simpan
async function onSave() {
  if (!validate()) { setError("..."); return; }
  setSaving(true);
  setError(null);
  try {
    const res = await api(editing ? `/api/v1/<plural>/${editing.id}` : "/api/v1/<plural>", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(mapToPayload(form)),
    });
    if (!res.ok) { setError(res.error ?? "Gagal"); return; }
    setOpen(false);
    setEditing(null);
    await qc.invalidateQueries({ queryKey: ["spine", "<plural>"] });
    selectItem((res.data as <Entity>).id);     // ← pilih record yang baru disimpan
    setRefreshKey((k) => k + 1);
  } catch {
    setError("Gagal menyimpan");
  } finally {
    setSaving(false);
  }
}
```

---

## 6. Pola columns

Definisi array `SmallTableColumn`:

```tsx
const columns: SmallTableColumn<<Entity>>[] = [
  {
    key: "id",
    label: "ID",
    primary: true,     // ← selalu ada di mode kecil (small mode)
    render: (it) => <span className="text-text-tertiary">#{it.id}</span>,
  },
  {
    key: "code",
    label: "Code",
    primary: true,
    render: (it) => <span className="font-mono text-sm text-text-primary">{it.code}</span>,
  },
  // ...kolom lain
];
```

Aturan:
- Setidaknya 2 kolom bertanda `primary: true` (agar mode kecil tetap punya kolom).
- Gunakan `font-mono` untuk field yang formatnya penting (npwp, code, dll).
- Gunakan `font-medium text-text-primary` untuk field nama.

---

## 7. Pola tab detail

Definisi `tabs` array (dari `module-extensions` atau hardcode):

```tsx
const tabs = [
  { slug: "overview", label: "Overview", api: "", position: 0 },
  { slug: "branches", label: "Branches", api: "/api/v1/customers/{id}/branches", position: 10 },
];
```

Gunakan `module-extensions` hook kalau modul di-register lewat manifest:

```tsx
const { data: ext } = useModuleExtensions();
const tabs = ext?.detail_tabs["<module-slug>"] ?? [];
```

- Tab pertama (`overview`) render tanpa fetch, pakai `inlineData` (record sudah ada di client).
- Tab lain fetch via `getTabUrl` (default: ganti `{id}` dengan id row).

---

## 8. Pola toolbar (action buttons)

Tombol action (Edit, Delete, dll) + tombol toggle ◀/▶ diletakkan di `toolbar` prop:

```tsx
toolbar={(item) => (
  <>
    {canEdit && (
      <Button appearance="outline" onClick={() => openEdit(item)}>
        Edit
      </Button>
    )}
    {canDelete && (
      <Button appearance="outline" onClick={() => onDelete(item)}>
        Delete
      </Button>
    )}
    <Button appearance="outline" onClick={() => setSmallView((v) => !v)}>
      {smallView ? "◀" : "▶"}
    </Button>
  </>
)}
```

---

## 9. Pola `tabHideKeys`

Sembunyikan field yang tidak perlu tampil di detail panel (cukup tampilkan di
kolom tabel atau di custom value):

```tsx
tabHideKeys={["id", "name", "vat_id"]}
```

Alasan:
- `id` biasanya sudah ada di header panel (`#{id}`).
- `name` sudah ada di renderHeader.
- `vat_id` (FK) kosongkan → tampilkan `vat.npwp` via custom value.

---

## 10. Pola custom value (render field kustom)

Gunakan `tabCustomValue` untuk render field yang butuh format khusus:

```tsx
const detailCustom = {
  is_active: (v: unknown) => (
    <StatusBadge status={v ? "active" : "inactive"} />
  ),
  vat: (v: unknown) => {
    const vat = v as Customer["vat"];
    return vat ? (
      <span className="font-mono text-xs text-text-secondary">
        {vat.npwp}
      </span>
    ) : (
      <span className="text-text-tertiary">—</span>
    );
  },
};

// Gunakan:
tabCustomValue={detailCustom}
```

Contoh: field `vat` adalah object `{ id, npwp, name }`. Tanpa custom, akan
di-render sebagai `[object Object]`. Custom value render `vat.npwp`.

---

## 11. Pola perPage

Gunakan hook `usePaginationLimit` untuk ambil setting dari `tables_pagination_limit`:

```tsx
const perPage = usePaginationLimit();     // default 10, bisa di-override di Settings
```

SmallTable sudah handle pagination client-side. Hook panggil API `GET /api/v1/settings/tables_pagination_limit`
satu kali saat mount.

---

## 12. Pola search/filter

SmallTable sudah punya search client-side built-in. Tidak perlu tambah search
input manual di parent. Gunakan:

```tsx
getSearchText={(it) => `${it.code} ${it.name} ${it.email ?? ""}`}
searchableKeys={["code", "name"]}     // ← optional: fallback jika getSearchText tidak ada
```

SmallTable akan tampilkan search box otomatis kalau `getSearchText` atau
`searchableKeys` diisi.

---

## 13. Template cepat: copy-paste dasar

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth_context";
import {
  SmallTable,
  type SmallTableColumn,
} from "@/components/spine/small-table";
import { Button } from "@/components/tailgrids/core/button";
import { usePaginationLimit } from "@/services/spine/use-pagination-limit";

interface <Entity> {
  id: number;
  // ...field
}

const EMPTY_FORM: <FormType> = { ... };

export default function <PluralName>Page() {
  const router = useRouter();
  const { token, user: me, ready } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();

  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<<Entity> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // POLA: state smallView di parent
  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const h = Number(window.location.hash.replace("#", ""));
    return h || null;
  });

  const canView = can(me, "<plural>:view");
  const canCreate = can(me, "<plural>:create");
  const canEdit = can(me, "<plural>:edit");
  const canDelete = can(me, "<plural>:delete");

  // Kembali ke login kalau belum authenticated
  useEffect(() => {
    if (ready && !token) router.replace("/login");
  }, [ready, token, router]);

  if (!ready || !token) return null;

  const { data: items = [], isPending } = useQuery({
    queryKey: ["spine", "<plural>", token],
    queryFn: async () => {
      const res = await api<{ data: <Entity>[] }>("/api/v1/<plural>");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  // ... (kolom, handler, dll)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            <PluralName>
          </h1>
        </div>
        {canCreate && <Button onClick={openCreate}>Add <PluralName></Button>}
      </div>

      {error && <p className="text-sm text-text-tertiary">{error}</p>}

      {isPending ? (
        <p className="text-sm text-text-tertiary">Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={[{ slug: "overview", label: "Overview", api: "", position: 0 }]}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          getSearchText={(it) => "<field1> <field2>"}
          tabHideKeys={["id"]}
          toolbar={(item) => (
            <>
              {canEdit && (
                <Button appearance="outline" onClick={() => openEdit(item)}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button appearance="outline" onClick={() => onDelete(item)}>
                  Delete
                </Button>
              )}
              <Button appearance="outline" onClick={() => setSmallView((v) => !v)}>
                {smallView ? "◀" : "▶"}
              </Button>
            </>
          )}
        />
      )}

      {/* Dialog form */}
      {open && ( ... )}
    </div>
  );
}
```

---

## 14. Checklist sebelum deploy

- [ ] `showDetail` state ada di parent, bukan di SmallTable.
- [ ] `onSelectId` handler panggil `setSmallView(true)`.
- [ ] Tombol toggle ◀/▶ ada di toolbar prop (atau di luar SmallTable).
- [ ] `useEffect` kembali ke login kalau belum authenticated.
- [ ] `queryKey` pakai pattern `["spine", "<plural>", token]`.
- [ ] Permission names: `<plural>:view`, `<plural>:create`, `<plural>:edit`, `<plural>:delete`.
- [ ] `tabHideKeys`: sembunyikan `id`, `name`, dan FK field yang tidak perlu.
- [ ] `getSearchText` diisi (agar search box tampil).
- [ ] Kolom minimal 2 `primary: true`.
- [ ] Nama file: `src/app/(with-layouts)/<plural>/page.tsx`.

---

## 15. Modul yang sudah mengikuti pola ini (reference)

- `customers/page.tsx` — pola lengkap (CRUD + dialog form + toolbar + custom value).
- `vats/page.tsx` — pola lengkap.
- `sample/page.tsx` — pola asli Spine (boilerplate Sample module).
- `sample-tasks/page.tsx` — pola asli Spine (SampleTasks module, extend_detail_tabs).
- `region/page.tsx` — pola (hanya list, tanpa toolbar/action).
- `users/page.tsx` — pola (CRUD lengkap + role assignment).
