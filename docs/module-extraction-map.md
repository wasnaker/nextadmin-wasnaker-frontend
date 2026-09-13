# Wasnaker — Module Extraction Map (frontend → paket)

Sumber: `wasnaker-core/modules/` (17 manifest) · `wasnaker-frontend/src/modules/` (23 folder) · `src/app/(with-layouts)/` (route)
Dibuat: 2026-09-13 · Acuan: `wasnaker-frontend-module-map.md`, `wasnaker-module-standard.md`

## Pemetaan backend ↔ frontend

| # | Backend modul | Paket frontend (`@wasnaker/...-web`) | Folder `src/modules/` sekarang | Route `src/app/(with-layouts)/` | Ket. |
|---|---|---|---|---|---|
| 1 | Customer | customer | customers | customers | pola lengkap (Task 4) |
| 2 | Surveyor | surveyor | surveyors | surveyors | |
| 3 | Equipment | equipment | equipments, equipment-categories, equipment-groups, equipment-subgroups, my-equipment | 5 route | 1 paket, 5 halaman |
| 4 | Rfq | rfq | rfqs | rfqs | halaman terbesar (765 loc) |
| 5 | Agency | agency | agencies | agencies | |
| 6 | Association | association | associations | associations | |
| 7 | Connection | connection | connections, connect | connections, connect/[token] | `/connect/[token]` = approval via email |
| 8 | Membership | membership | plans | plans | slug ≠ nama backend |
| 9 | Referral | referral | referrals (+ profile/my-referral) | referrals | tab di dalam Profile = core, tab referral di modul |
| 10 | Region | region | region | region | SUDAH jadi paket `@wasnaker/region-web` |
| 11 | Vat | vat | vats | vats | |
| 12 | Workflow | workflow | workflows | workflows | |
| 13 | Platform | platform | platform | platform/* | staff/cuti/gaji; cuti & gaji placeholder |
| 14 | Todo | — (widget core) | — | — | widget dashboard, tanpa halaman |
| 15 | Impersonate | — (banner core) | — | — | banner header, tanpa halaman |
| 16 | Subscription | — | — | — | API saja, belum ada UI |

## Bukan modul — TETAP host (verified: tidak ada manifest backend)

| Folder | Alasan |
|---|---|
| home | dashboard host `(dashboard)/(home)` |
| profile | shell profil host (4 tab core) |
| users, roles, settings | TIDAK ada modul User/Role/Setting di `wasnaker-core/modules/` (17 modul terverifikasi) — platform host |
| login, register | auth host |
| sample, sample-tasks | tanpa manifest backend — DIBIARKAN (keputusan user, tidak disentuh) |

## Kedudukan paket (folder → repo)

- Semua paket: `/www/wwwroot/wasnaker-modules/<slug>/src` (alias source-TS, tanpa npm install — pola mantine host).
- Repo git per modul: DITUNDA (Task 9 opsional). Folder paket = sumber; repo muncul bila host kedua/tim kedua benar-benar konsumsi (YAGNI).

## Aturan lapisan (module-standard §6) — berlaku saat ekstraksi

- `services/ hooks/ types/ i18n/` → hanya import `@wasnaker/web-core` + library murni (headless, portable).
- `components/ pages/` → boleh import UI kit host via alias `@wasnaker/next-ui` (tailgrids re-export) — UI per host.
- Modul dilarang import modul lain. Host hanya import via registry.
- i18n: JSON per locale; string bisnis di paket modul, string core di core — `en.json` kosong (key = teks Inggris, fallback).