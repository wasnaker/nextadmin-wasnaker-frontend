/**
 * Merge layout dashboard — murni (tanpa React/fetch) supaya bisa di-self-check.
 * Tipe widget = structural, kompatibel dgn ModuleWidget (services/spine/module-extensions).
 */

export interface DashboardWidgetMeta {
  id: string;
  area: string;
  title: string;
  api: string;
  module: string;
}

/**
 * Area grid dashboard — keputusan UI frontend (backend: area bebas).
 * Pola legacy app: top-12 (full) + left-8 + right-4.
 */
export const DASHBOARD_AREAS = ["top-12", "left-8", "right-4"] as const;

export const AREA_LABELS: Record<string, string> = {
  "top-12": "Full width",
  "left-8": "Left column",
  "right-4": "Right column",
};

/**
 * Semantik merge legacy (application/helpers/widgets_helper.php):
 * - layout null  -> semua widget di area DEFAULT-nya (urutan katalog).
 * - layout ada   -> per area: id sesuai urutan tersimpan (skip yg sudah tidak
 *   terdaftar), lalu FALLBACK: widget terdaftar yang TIDAK ditempatkan di area
 *   layout manapun dirender di area default-nya (urutan katalog).
 * Nilai 'empty' (string) pada layout user diperlakukan sebagai daftar kosong.
 * @return Record<area, DashboardWidgetMeta[]> — urutan render siap pakai.
 */
export function resolveDashboardLayout(
  layout: Record<string, string[]> | null,
  widgets: DashboardWidgetMeta[],
  areas: readonly string[] = DASHBOARD_AREAS
): Record<string, DashboardWidgetMeta[]> {
  const byId = new Map(widgets.map((w) => [w.id, w]));

  if (!layout) {
    return Object.fromEntries(
      areas.map((area) => [area, widgets.filter((w) => w.area === area)])
    );
  }

  const placed = new Set<string>();
  for (const ids of Object.values(layout)) {
    for (const id of Array.isArray(ids) ? ids : []) placed.add(id);
  }

  const unplacedByDefaultArea: Record<string, DashboardWidgetMeta[]> = {};
  for (const w of widgets) {
    if (!placed.has(w.id)) {
      (unplacedByDefaultArea[w.area] ??= []).push(w);
    }
  }

  const resolved: Record<string, DashboardWidgetMeta[]> = {};
  for (const area of areas) {
    const savedIds = Array.isArray(layout[area]) ? layout[area] : [];
    const saved = savedIds
      .map((id) => byId.get(id))
      .filter((w): w is DashboardWidgetMeta => Boolean(w));
    resolved[area] = [...saved, ...(unplacedByDefaultArea[area] ?? [])];
  }
  return resolved;
}

/** Widget tersembunyi: visibility map absen/true = tampil; false = sembunyi. */
export function isWidgetVisible(
  widgetId: string,
  visibility: Record<string, boolean> | null
): boolean {
  return !(visibility && visibility[widgetId] === false);
}

// ---------------------------------------------------------------------------
// Self-check: kompilasi (tsc dashboard-merge.ts --outDir /tmp/...) lalu
// `node /tmp/.../dashboard-merge.js`. Tidak dieksekusi saat di-import app.
// ---------------------------------------------------------------------------
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

const W = (id: string, area: string): DashboardWidgetMeta => ({
  id,
  area,
  title: id,
  api: "/api/v1/x",
  module: "m",
});

function run() {
  const widgets = [W("a", "right-4"), W("b", "right-4"), W("c", "left-8")];

  const def = resolveDashboardLayout(null, widgets);
  check("null: right-4 = [a,b]", def["right-4"].map((w) => w.id).join() === "a,b");
  check("null: left-8 = [c]", def["left-8"].map((w) => w.id).join() === "c");
  check("null: top-12 kosong", def["top-12"].length === 0);

  const moved = resolveDashboardLayout(
    { "top-12": ["a"], "left-8": ["b", "c"], "right-4": [] },
    widgets
  );
  check("moved: top-12 = [a]", moved["top-12"].map((w) => w.id).join() === "a");
  check("moved: left-8 = [b,c]", moved["left-8"].map((w) => w.id).join() === "b,c");

  const partial = resolveDashboardLayout({ "left-8": ["c"] }, widgets);
  check(
    "fallback: right-4 dapat a,b (urutan katalog)",
    partial["right-4"].map((w) => w.id).join() === "a,b"
  );

  const ghost = resolveDashboardLayout(
    { "right-4": ["ghost", "a"], "top-12": [] },
    widgets
  );
  check(
    "ghost: diskip, b fallback di right-4",
    ghost["right-4"].map((w) => w.id).join() === "a,b"
  );

  const emptied = resolveDashboardLayout({ "right-4": "empty" as never }, [W("a", "right-4")]);
  check("empty string: diperlakukan kosong (a fallback)", emptied["right-4"].length === 1);

  check("visible default", isWidgetVisible("a", null));
  check("visible true", isWidgetVisible("a", { a: true }));
  check("hidden false", !isWidgetVisible("a", { a: false }));
  check("absen di map = tampil", isWidgetVisible("z", { a: false }));

  console.log(process.exitCode ? "RESULT: ada FAIL" : "RESULT: semua pass");
}

// Guard: hanya saat dijalankan langsung sebagai script (node .../dashboard-merge.js)
if (
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  process.argv[1]?.endsWith("dashboard-merge.js")
) {
  run();
}
