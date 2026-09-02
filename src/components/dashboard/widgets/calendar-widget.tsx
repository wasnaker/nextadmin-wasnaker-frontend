"use client";

import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { api, getToken } from "@/services/spine/api";

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end?: string | null;
  color?: string | null;
}

/**
 * Widget Calendar — menampilkan events modul Events (fullcalendar month).
 * Paritas legacy dashboard/widgets/calendar.php: kalender events milik user.
 * Interaksi create/edit/drag = menyusul bersama halaman Calendar penuh.
 */
export function CalendarWidget({ apiPath }: { apiPath: string }) {
  const token = getToken();
  const { data = [], isPending } = useQuery({
    queryKey: ["spine", "calendar", apiPath, token],
    queryFn: async () => {
      const res = await api<{ data: CalendarEvent[] }>(apiPath);
      if (!res.ok) throw new Error(res.error ?? "Gagal memuat kalender");
      return (res.data?.data ?? []).map((e) => ({
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end ?? undefined,
        color: e.color ?? undefined,
      }));
    },
    enabled: Boolean(token),
  });

  if (isPending) {
    return <p className="text-sm text-text-tertiary">Memuat kalender…</p>;
  }

  return (
    <FullCalendar
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      events={data}
      height="auto"
      locale="id"
      headerToolbar={{ left: "prev,next", center: "title", right: "" }}
      dayMaxEvents={2}
      eventDisplay="block"
    />
  );
}
