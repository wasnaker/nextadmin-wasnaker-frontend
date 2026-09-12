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
 * Area grid BASE dashboard — padanan div `data-container` di dashboard.php
 * legacy (urutan array = urutan render/posisi di view):
 *   top-12 → middle-left-6 + middle-right-6 → left-8 + right-4 → bottom ×3.
 * Lebar kolom DITURUNKAN dari suffix angka id (grid 12):
 *   -12 full, -8/-6/-4/-3/-2 = col-span N/12 → area 2/3/4/6 kolom tinggal
 *   definisikan id (mis. `bottom-4` = 3 kolom, `row-3` = 4 kolom, `row-2` = 6).
 */
export const DASHBOARD_AREAS = [
  "top-12",
  "middle-left-6",
  "middle-right-6",
  "left-8",
  "right-4",
  "bottom-left-4",
  "bottom-middle-4",
  "bottom-right-4",
] as const;

/** Lebar kolom (1-12) dari suffix angka id area; non-angka/aneh -> full. */
export function areaSpan(area: string): number {
  const m = /-(\d+)$/.exec(area);
  const n = m ? Number(m[1]) : 12;
  return n >= 1 && n <= 12 ? n : 12;
}

/** Label ramah area: "middle-left-6" -> "middle left". */
export function areaLabel(area: string): string {
  return area
    .split("-")
    .filter((s) => !/^\d+$/.test(s))
    .join(" ");
}

/**
 * Daftar area EFEKTIF: base (urutan array) + area tambahan yang dibawa
 * katalog widget (default area modul, mis. area baru milik modul Quotations)
 * + area yang tersimpan di layout user. Area tambahan append di belakang base
 * (urutan kemunculan pertama).
 * ponytail: posisi area tambahan selalu di bawah base; upgrade ke konvensi
 * posisi per-blok (middle/bottom) bila modul produksi butuh sisip tengah.
 */
export function resolveAreas(
  widgets: DashboardWidgetMeta[],
  layout: Record<string, string[]> | null | undefined
): string[] {
  const areas: string[] = [...DASHBOARD_AREAS];
  const push = (a: string) => {
    if (a && !areas.includes(a)) areas.push(a);
  };
  for (const w of widgets) push(w.area);
  if (layout) for (const a of Object.keys(layout)) push(a);
  return areas;
}

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
  areas: readonly string[] = resolveAreas(widgets, layout)
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
  // 0. lebar kolom dari id
  check("span: top-12 = 12", areaSpan("top-12") === 12);
  check("span: right-4 = 4", areaSpan("right-4") === 4);
  check("span: row-3 = 3 (4 kolom)", areaSpan("row-3") === 3);
  check("span: row-2 = 2 (6 kolom)", areaSpan("row-2") === 2);
  check("span: tanpa angka = 12", areaSpan("middle") === 12);
  check("label: middle-left-6 -> middle left", areaLabel("middle-left-6") === "middle left");

  // 0b. area efektif: base + area tambahan katalog + area di layout
  const areas = resolveAreas([W("q", "bottom-quotes-4")], { "row-x-3": [] });
  check("areas: 8 base + 2 tambahan", areas.length === 10);
  check("areas: base di depan", areas[0] === "top-12" && areas[7] === "bottom-right-4");
  check("areas: area katalog append", areas[8] === "bottom-quotes-4" && areas[9] === "row-x-3");

  const widgets = [W("a", "right-4"), W("b", "right-4"), W("c", "left-8")];

  // 1. layout null -> semua di area default, urutan katalog
  const def = resolveDashboardLayout(null, widgets);
  check("null: right-4 = [a,b]", def["right-4"].map((w) => w.id).join() === "a,b");
  check("null: left-8 = [c]", def["left-8"].map((w) => w.id).join() === "c");
  check("null: top-12 kosong", def["top-12"].length === 0);

  // 2. layout ada + reorder + pindah area
  const moved = resolveDashboardLayout(
    { "top-12": ["a"], "left-8": ["b", "c"], "right-4": [] },
    widgets
  );
  check("moved: top-12 = [a]", moved["top-12"].map((w) => w.id).join() === "a");
  check("moved: left-8 = [b,c]", moved["left-8"].map((w) => w.id).join() === "b,c");

  // 3. fallback: widget terdaftar tak ditempatkan -> area default
  const partial = resolveDashboardLayout({ "left-8": ["c"] }, widgets);
  check(
    "fallback: right-4 dapat a,b (urutan katalog)",
    partial["right-4"].map((w) => w.id).join() === "a,b"
  );

  // 4. widget siluman di layout -> skip, dan tidak dihitung "placed"
  const ghost = resolveDashboardLayout(
    { "right-4": ["ghost", "a"], "top-12": [] },
    widgets
  );
  check(
    "ghost: diskip, b fallback di right-4",
    ghost["right-4"].map((w) => w.id).join() === "a,b"
  );

  // 5. 'empty' string -> area kosong (dan widget2nya jd unplaced -> fallback)
  const emptied = resolveDashboardLayout({ "right-4": "empty" as never }, [W("a", "right-4")]);
  check("empty string: diperlakukan kosong (a fallback)", emptied["right-4"].length === 1);

  // 6. area custom dari katalog: widget default area baru ikut dirender
  const custom = resolveDashboardLayout(
    null,
    [...widgets, W("quotes", "bottom-quotes-4")]
  );
  check(
    "custom area: widget quotes dirender di bottom-quotes-4",
    custom["bottom-quotes-4"].map((w) => w.id).join() === "quotes"
  );

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
