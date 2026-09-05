'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/spine/api';
import { can, useAuth } from '@/services/spine/auth-context';
import {
  SmallTable,
  type SmallTableColumn,
} from '@/components/spine/small-table';
import { StatusBadge } from '@/components/spine/status-badge';
import { Button } from '@/components/tailgrids/core/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/tailgrids/core/dialog';
import { FieldLabel } from '@/components/tailgrids/core/field';
import { Input } from '@/components/tailgrids/core/input';
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/tailgrids/core/select';
import { usePaginationLimit } from '@/services/spine/use-pagination-limit';
import { useModuleExtensions } from '@/services/spine/module-extensions';

interface Surveyor {
  id: number;
  ulid?: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat?: { id: number; npwp: string; name: string | null } | null;
  parent?: { id: number; code: string; name: string } | null;
  province?: { id: number; code: string; name: string } | null;
  regency?: { id: number; name: string } | null;
  is_active: boolean;
  created_at?: string;
}

interface ProvinceOption {
  id: number;
  code: string;
  name: string;
}

interface RegencyOption {
  id: number;
  code: string;
  name: string;
}

const EMPTY_FORM = {
  code: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  npwp: '',
  province_id: '',
  regency_id: '',
  is_active: true,
};

export default function SurveyorsPage() {
  const { token, user: me } = useAuth();
  const qc = useQueryClient();
  const perPage = usePaginationLimit();
  const [refreshKey, setRefreshKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Surveyor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [smallView, setSmallView] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const h = Number(window.location.hash.replace('#', ''));
    return h || null;
  });

  const canView = can(me, 'surveyor:view|surveyor:view-connected');
  const canCreate = can(me, 'surveyor:create');
  const canEdit = can(me, 'surveyor:edit');
  const canDelete = can(me, 'surveyor:delete');

  const { data: items = [], isPending } = useQuery({
    queryKey: ['spine', 'surveyors', token],
    queryFn: async () => {
      const res = await api<{ data: Surveyor[] }>('/api/v1/surveyors');
      if (!res.ok) throw new Error(res.error ?? 'Gagal memuat');
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: ext } = useModuleExtensions();
  const tabs = useMemo(
    () =>
      (ext?.detail_tabs['surveyor'] ?? []).sort(
        (a, b) => (a.position ?? 999) - (b.position ?? 999),
      ),
    [ext],
  );

  // Data referensi region (cascading: kabupaten mengikuti provinsi)
  const { data: provinces = [] } = useQuery({
    queryKey: ['region', 'provinces', token],
    queryFn: async () => {
      const res = await api<{ data: ProvinceOption[] }>('/api/v1/provinces');
      if (!res.ok) throw new Error(res.error ?? 'Gagal memuat provinsi');
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && open,
  });

  const { data: regencies = [] } = useQuery({
    queryKey: ['region', 'regencies', form.province_id, token],
    queryFn: async () => {
      const res = await api<{ data: RegencyOption[] }>(
        `/api/v1/regencies?province_id=${form.province_id}`,
      );
      if (!res.ok) throw new Error(res.error ?? 'Gagal memuat kabupaten');
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && Boolean(form.province_id),
  });

  const columns: SmallTableColumn<Surveyor>[] = [
    {
      key: 'id',
      label: 'ID',
      primary: true,
      render: (it) => <span className='text-text-tertiary'>#{it.id}</span>,
    },
    {
      key: 'code',
      label: 'Code',
      primary: true,
      render: (it) => (
        <span className='font-mono text-sm text-text-primary'>{it.code}</span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      primary: true,
      render: (it) => (
        <span className='font-medium text-text-primary'>{it.name}</span>
      ),
    },
    {
      key: 'ho',
      label: 'HO',
      render: (it) =>
        it.parent ? (
          <span className='text-text-secondary'>
            {it.parent.code} {it.parent.name}
          </span>
        ) : (
          <span className='text-text-tertiary'>—</span>
        ),
    },
    {
      key: 'npwp',
      label: 'NPWP',
      render: (it) =>
        it.vat ? (
          <span className='font-mono text-xs text-text-secondary'>
            {it.vat.npwp}
          </span>
        ) : (
          <span className='text-text-tertiary'>—</span>
        ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (it) => (
        <StatusBadge status={it.is_active ? 'active' : 'inactive'} />
      ),
    },
  ];

  const detailCustom = {
    is_active: (v: unknown) => (
      <StatusBadge status={v ? 'active' : 'inactive'} />
    ),
    parent: (v: unknown) =>
      v && typeof v === 'object' ? (
        <span className='text-text-primary'>
          {(v as { code?: string; name?: string }).code}{' '}
          {(v as { name?: string }).name ?? '—'}
        </span>
      ) : (
        <span className='text-text-tertiary'>—</span>
      ),
    admin: (v: unknown) =>
      v && typeof v === 'object' ? (
        <span className='text-text-primary'>
          {(v as { name?: string }).name ?? '—'}
        </span>
      ) : (
        <span className='text-text-tertiary'>—</span>
      ),
    province: (v: unknown) =>
      v && typeof v === 'object' ? (
        <span className='text-text-secondary'>
          {(v as { name?: string }).name ?? '—'}
        </span>
      ) : (
        <span className='text-text-tertiary'>—</span>
      ),
    regency: (v: unknown) =>
      v && typeof v === 'object' ? (
        <span className='text-text-secondary'>
          {(v as { name?: string }).name ?? '—'}
        </span>
      ) : (
        <span className='text-text-tertiary'>—</span>
      ),
    vat: (v: unknown) => {
      const vat = v as Surveyor['vat'];
      return vat ? (
        <span className='font-mono text-xs text-text-secondary'>
          {vat.npwp}
        </span>
      ) : (
        <span className='text-text-tertiary'>—</span>
      );
    },
  };

  function selectItem(id: number | string) {
    const n = Number(id);
    setSelectedId(n);
    window.location.hash = String(n);
    setSmallView(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: Surveyor) {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      email: item.email ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
      npwp: item.vat?.npwp ?? '',
      province_id: String(item.province?.id ?? ''),
      regency_id: String(item.regency?.id ?? ''),
      is_active: item.is_active,
    });
    setError(null);
    setOpen(true);
  }

  async function onSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code dan Name wajib diisi');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        npwp: form.npwp.trim() || null,
        province_id: form.province_id ? Number(form.province_id) : null,
        regency_id: form.regency_id ? Number(form.regency_id) : null,
        is_active: form.is_active,
      };
      const res = await api(
        editing ? `/api/v1/surveyors/${editing.id}` : '/api/v1/surveyors',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        setError(res.error ?? 'Gagal menyimpan');
        return;
      }
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['spine', 'surveyors'] });
      const savedId = (res.data as Surveyor).id;
      selectItem(savedId);
      setRefreshKey((k) => k + 1);
    } catch {
      setError('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: Surveyor) {
    if (!window.confirm(`Hapus surveyor ${item.name} (${item.code})?`)) return;
    const res = await api('/api/v1/surveyors/' + item.id, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setError(res.error ?? 'Gagal menghapus');
      return;
    }
    if (selectedId === item.id) {
      setSelectedId(null);
      window.location.hash = '';
      setSmallView(false);
    }
    await qc.invalidateQueries({ queryKey: ['spine', 'surveyors'] });
    setRefreshKey((k) => k + 1);
  }

  if (!canView) {
    return (
      <p className='text-sm text-text-tertiary'>
        Anda tidak memiliki akses ke manajemen surveyor.
      </p>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-text-primary'>
            Surveyors
          </h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Data surveyor + cabang. Branch per surveyor di tab Branches.
          </p>
        </div>
        {canCreate && <Button onClick={openCreate}>Add Surveyor</Button>}
      </div>

      {error && <p className='text-sm text-text-tertiary'>{error}</p>}

      {isPending ? (
        <p className='text-sm text-text-tertiary'>Memuat...</p>
      ) : (
        <SmallTable
          items={items}
          tabs={tabs}
          columns={columns}
          selectedId={selectedId}
          onSelectId={selectItem}
          getItemId={(it) => it.id}
          showDetail={smallView}
          refreshKey={refreshKey}
          perPage={perPage}
          tabCustomValue={detailCustom}
          getSearchText={(it) =>
            `${it.code} ${it.name} ${it.email ?? ''} ${it.vat?.npwp ?? ''}`
          }
          tabHideKeys={['ulid', 'id', 'name', 'vat_id', 'properties', 'created_at', 'updated_at', 'deleted_at', 'province_id', 'regency_id', 'parent_id', 'admin_id', 'type', 'user_id', 'surveyor_id', 'is_active']}
          renderHeader={(it) => (
            <span className='flex items-center gap-2'>
              <StatusBadge status={it.is_active ? 'active' : 'inactive'} />
              <span className='text-text-primary'>{it.name}</span>
              <span className='font-mono text-xs text-text-tertiary'>
                {it.code}
              </span>
            </span>
          )}
          toolbar={(item) => (
            <>
              {canEdit && (
                <Button appearance='outline' onClick={() => openEdit(item)}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button appearance='outline' onClick={() => onDelete(item)}>
                  Delete
                </Button>
              )}
              <Button
                appearance='outline'
                onClick={() => setSmallView((v) => !v)}
              >
                {smallView ? '◀' : '▶'}
              </Button>
            </>
          )}
        />
      )}

      {open && (
        <Dialog isOpen={open} onOpenChange={setOpen}>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Surveyor #${editing.id}` : 'Add Surveyor'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className='space-y-3'>
            <div>
              <FieldLabel htmlFor='f-code'>Code</FieldLabel>
              <Input
                id='f-code'
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder='S001'
                className='mt-1.5 w-full font-mono'
              />
            </div>
            <div>
              <FieldLabel htmlFor='f-name'>Name</FieldLabel>
              <Input
                id='f-name'
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='PT Surveyor Nusantara'
                className='mt-1.5 w-full'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <FieldLabel htmlFor='f-email'>Email</FieldLabel>
                <Input
                  id='f-email'
                  type='email'
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className='mt-1.5 w-full'
                />
              </div>
              <div>
                <FieldLabel htmlFor='f-phone'>Phone</FieldLabel>
                <Input
                  id='f-phone'
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className='mt-1.5 w-full'
                />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor='f-address'>Alamat</FieldLabel>
              <Input
                id='f-address'
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className='mt-1.5 w-full'
              />
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Select
                  value={form.province_id}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      province_id: String(v ?? ''),
                      regency_id: '',
                    })
                  }
                  className='w-full'
                  aria-label='Provinsi'
                >
                  <SelectLabel>Provinsi</SelectLabel>
                  <SelectTrigger className='w-full border-border-secondary bg-input-background py-2.5'>
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className='min-w-(--trigger-width)'>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} id={String(p.id)} textValue={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select
                  value={form.regency_id}
                  onChange={(v) =>
                    setForm({ ...form, regency_id: String(v ?? '') })
                  }
                  className='w-full'
                  aria-label='Kabupaten/Kota'
                >
                  <SelectLabel>Kabupaten/Kota</SelectLabel>
                  <SelectTrigger className='w-full border-border-secondary bg-input-background py-2.5'>
                    <SelectValue />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent className='min-w-(--trigger-width)'>
                    {regencies.map((r) => (
                      <SelectItem key={r.id} id={String(r.id)} textValue={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor='f-npwp'>NPWP (opsional)</FieldLabel>
              <Input
                id='f-npwp'
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                placeholder='01.234.567.8-901.000'
                className='mt-1.5 w-full font-mono'
              />
            </div>
            <div>
              <label className='flex items-center gap-2 text-sm text-text-secondary'>
                <input
                  type='checkbox'
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className='rounded border-border-primary text-icon-primary'
                />
                Aktif
              </label>
            </div>
            {error && <p className='text-sm text-text-tertiary'>{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button
              appearance='outline'
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={onSave} isDisabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
