"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/spine/api";
import { can, useAuth } from "@/services/spine/auth-context";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";

interface WorkflowState {
  label: string;
  color: string;
}

interface WorkflowTransition {
  label?: string;
  from: string[];
  to: string;
  actor?: string[];
}

interface Workflow {
  entity_type: string;
  label: string;
  states_count: number;
  transitions_count: number;
}

interface WorkflowDetail extends Omit<Workflow, "label"> {
  label?: string;
  states?: Record<string, WorkflowState>;
  transitions?: Record<string, WorkflowTransition>;
}

const ACTOR_COLOR: Record<string, string> = {
  customer: "bg-blue-100 text-blue-800",
  surveyor: "bg-green-100 text-green-800",
  admin: "bg-red-100 text-red-800",
};

/** Workflows — visualizer state machine code-driven (tanpa DB). */
export default function WorkflowsPage() {
  const { token, user: me } = useAuth();
  const canView = can(me, "workflow:view");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: workflows = [], isPending } = useQuery({
    queryKey: ["spine", "workflows", token],
    queryFn: async () => {
      const res = await api<{ data: Workflow[] }>("/api/v1/workflows");
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? [];
    },
    enabled: Boolean(token) && canView,
  });

  const { data: detail, isPending: detailPending } = useQuery({
    queryKey: ["spine", "workflows", selected, token],
    queryFn: async () => {
      const res = await api<{ data: WorkflowDetail }>(
        `/api/v1/workflows/${selected}`
      );
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat");
      return res.data?.data ?? null;
    },
    enabled: Boolean(token) && canView && selected !== null,
  });

  const states = useMemo(() => {
    const s = detail?.states ?? {};
    return Object.entries(s).map(([key, v]) => ({ key, ...v }));
  }, [detail]);

  const transitions = useMemo(() => {
    const t = detail?.transitions ?? {};
    return Object.entries(t).map(([key, v]) => ({ name: key, ...v }));
  }, [detail]);

  if (!canView) {
    return (
      <p className="text-sm text-text-tertiary">
        Anda tidak memiliki akses ke Workflows.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Workflows
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          State machine code-driven — daftar transisi status per dokumen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TableRoot className="rounded-lg border border-border-primary">
          <TableHeader>
            <TableRow className="[&_th]:border-t">
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Entity Type
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Label
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                States
              </TableHead>
              <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                Transitions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell className="px-4 py-2.5 text-sm text-text-tertiary">
                  Memuat...
                </TableCell>
              </TableRow>
            ) : (
              workflows.map((w) => (
                <TableRow
                  key={w.entity_type}
                  className={`cursor-pointer [&_td]:border-none ${
                    selected === w.entity_type
                      ? "bg-card-surface-area"
                      : "hover:bg-card-surface-area"
                  }`}
                  onClick={() => setSelected(w.entity_type)}
                >
                  <TableCell className="px-4 py-2.5">
                    <code className="text-xs text-text-primary">
                      {w.entity_type}
                    </code>
                  </TableCell>
                  <TableCell className="px-4 py-2.5 text-sm text-text-secondary">
                    {w.label}
                  </TableCell>
                  <TableCell className="px-4 py-2.5 text-sm text-text-secondary">
                    {w.states_count}
                  </TableCell>
                  <TableCell className="px-4 py-2.5 text-sm text-text-secondary">
                    {w.transitions_count}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </TableRoot>

        <div className="space-y-6">
          {!selected || (!detailPending && !detail) ? (
            <p className="text-sm text-text-tertiary">
              {selected
                ? "Workflow tidak ditemukan."
                : "Pilih satu workflow untuk melihat detail."}
            </p>
          ) : detailPending ? (
            <p className="text-sm text-text-tertiary">Memuat...</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary">
                  {detail.label ?? detail.entity_type}
                </h2>
                <code className="text-xs text-text-secondary">
                  {detail.entity_type}
                </code>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-text-tertiary">
                  States
                </p>
                <TableRoot className="rounded-lg border border-border-primary">
                  <TableHeader>
                    <TableRow className="[&_th]:border-t">
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        Key
                      </TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        Label
                      </TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        Warna
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {states.map((s) => (
                      <TableRow key={s.key} className="[&_td]:border-none">
                        <TableCell className="px-4 py-2.5">
                          <code className="text-xs">{s.key}</code>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm text-text-primary">
                          {s.label}
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full border border-black/15"
                              style={{ backgroundColor: s.color }}
                            />
                            <span
                              className="rounded px-1.5 py-0.5 text-xs text-white"
                              style={{ backgroundColor: s.color }}
                            >
                              {s.label}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-text-tertiary">
                  Transitions
                </p>
                <TableRoot className="rounded-lg border border-border-primary">
                  <TableHeader>
                    <TableRow className="[&_th]:border-t">
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        Transition
                      </TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        Label
                      </TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        From
                      </TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        To
                      </TableHead>
                      <TableHead className="px-4 py-2.5 text-xs font-semibold text-text-secondary">
                        Actor
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transitions.map((t) => (
                      <TableRow key={t.name} className="[&_td]:border-none">
                        <TableCell className="px-4 py-2.5">
                          <code className="text-xs">{t.name}</code>
                        </TableCell>
                        <TableCell className="px-4 py-2.5 text-sm text-text-primary">
                          {t.label ?? t.name}
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          {(t.from ?? []).map((f) => (
                            <StatePill key={f} keyName={f} states={detail.states ?? {}} />
                          ))}
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          <StatePill keyName={t.to} states={detail.states ?? {}} />
                        </TableCell>
                        <TableCell className="px-4 py-2.5">
                          {(t.actor ?? []).map((a) => (
                            <span
                              key={a}
                              className={`mr-1 rounded px-1.5 py-0.5 text-xs ${
                                ACTOR_COLOR[a] ?? "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {a}
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatePill({
  keyName,
  states,
}: {
  keyName: string;
  states: Record<string, WorkflowState>;
}) {
  const s = states[keyName];
  return (
    <span
      className="mr-1 inline-block rounded px-1.5 py-0.5 text-xs text-white"
      style={{ backgroundColor: s?.color ?? "#aaaaaa" }}
    >
      {s?.label ?? keyName}
    </span>
  );
}
