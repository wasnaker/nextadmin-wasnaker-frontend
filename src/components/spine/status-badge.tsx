import { Badge } from "@/components/tailgrids/core/badge";

const tones: Record<string, "success" | "warning" | "error" | "gray" | "primary"> = {
  done: "success",
  completed: "success",
  active: "success",
  in_progress: "warning",
  pending: "warning",
  draft: "gray",
  inactive: "gray",
  cancelled: "error",
  canceled: "error",
  rejected: "error",
};

/** Badge status generik — warna dari map, fallback gray. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge color={tones[status] ?? "gray"}>{status.replace(/_/g, " ")}</Badge>;
}
