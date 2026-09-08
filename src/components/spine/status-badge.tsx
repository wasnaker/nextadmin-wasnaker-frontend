import { Badge } from "@mantine/core";

const tones: Record<string, string> = {
  done: "green",
  completed: "green",
  active: "green",
  approved: "green",
  in_progress: "yellow",
  pending: "yellow",
  review: "yellow",
  draft: "gray",
  inactive: "gray",
  cancelled: "red",
  canceled: "red",
  rejected: "red",
};

/** Badge status generik — warna dari map, fallback gray. (Mantine) */
export function StatusBadge({ status }: { status: string }) {
  return <Badge color={tones[status] ?? "gray"}>{status.replace(/_/g, " ")}</Badge>;
}
