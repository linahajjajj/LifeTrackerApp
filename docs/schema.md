# Supabase schema (live, 30 Oct 2026)

Project **life-book** · ref `mbqagxtljzgfbhvaetda` · region eu-central-1 (Frankfurt) · Free plan.
SQL: `supabase/migrations/20261030090000_life_book_schema.sql` (applied).

## Design
- **One table per app collection.** Lists the app saves inside a record (recipe ingredients, a person's gifts/dates, settings bills/incomes/budgets) stay inside it as `jsonb`. runtime.js maps one app doc ⇄ one row.
- Every table has:
  | Column | Use |
  |---|---|
  | `user_id` uuid | defaults to `auth.uid()`; RLS: you only see/write your own rows |
  | `id` text | the app's existing id (backup imports as-is). PK = (user_id, id) |
  | typed columns | the stable fields (below), snake_case of the app key |
  | `extra` jsonb | every other app field, so nothing is lost |
  | `created_at` | app `createdAt` (ms → timestamptz) |
  | `updated_at` | **device time of the edit**. A trigger ignores any write older than the row (offline device can't overwrite newer data) |
  | `deleted_at` | soft delete. App "delete" sets this, "undo" clears it |
  | `synced_at` | **server time** set by trigger. Pull cursor: `where synced_at > last_pull` |
- Storage: private bucket `photos`, path `{user_id}/{asset id}`, 5 MB max, jpeg/png/webp. Columns `photo`/`orig` hold the asset id.

## Tables
| Table | App collection | Typed columns (rest → `extra`) |
|---|---|---|
| settings | settings/main | `data` jsonb (whole doc). Only id `main` |
| debts | debts | name, currency (NIS/USD), total, paid_before, sort_order (`order`) |
| people | people | name, rel, partner, birthday (text), notes, gift_budget, dates[], favs[], wants[], gifts[] |
| products | products | name, brand, size, notes, photo, status |
| entries | entries | amount, cat, note, date, orig_amt, debt_id, bill_id, person_id |
| wishes | wishes | cat, name, type, color, price, cur, where_from (`where`), added, status (waiting/bought/skipped), decided |
| food_logs | food | date, meal, name, plan (bool), kcal |
| weights | weights | date (one live row per day), kg |
| day_logs | days | date, `data` jsonb (habits, prayers, tasbih, sleep, mood… keys are dynamic) |
| cycles | cycle | start_date (`start`), end_date (`end`) |
| prices | prices | item, unit, ppu, date |
| recipes | recipes | title, servings, time, plan, for_him, ingredients[], steps[], tips[], photo, made, last_made |
| closet_items | closet | name, type, color, fit, clean, plan, orig, photo, crop, bright, status |
| date_nights | dates | date, idea, note |
| notes | notes | text, tag, pinned, url, label, photo |

## Links
| From | To | Rule |
|---|---|---|
| entries.debt_id | debts | FK (same user only). Hard purge → set null |
| entries.person_id | people | FK (same user only). Hard purge → set null |
| entries.bill_id | settings.data.bills[].id | no FK (bills live in settings) |
| recipes.ingredients[].product_id | products | no FK (inside jsonb) |
| notes.tag | settings.data.noteTags[].id | no FK |

## Decisions (30 Oct)
- Table shape matches the app (Lina chose this over child tables).
- Categories: **plain text id** (`cat`). Names live in the app's `CATS` list, so renaming a category never touches data. No `categories` table.
- Debt delete: app soft-deletes, so undo keeps working and payments stay linked. FK only acts on a hard purge (set null).
- `settings.incomes[]` = {id, name, usd, feePct, flat, count}. `incomeLog[]` = {id, src, name, cur, amt, rate, nis, date, forM?, cycle}.

## How sync works (runtime.js, built 30 Oct)
| Part | Detail |
|---|---|
| Local first | The app reads and writes IndexedDB `lina-life` (docs, blobs) as before: instant and offline |
| Outbox | Every save/delete adds `d:<collection>/<id>` or `b:<photo id>` to IndexedDB `lina-sync`.outbox |
| Push | Photos first, then records parents-first (settings, debts, people, products, then the rest). Bulk upsert 200 at a time. A bad record is parked (meta `parked`), the rest keep going |
| Newest wins | The database ignores older saves; the app then re-downloads the newer version |
| Delete | Soft (`deleted_at`). Undo re-saves the record and it comes back everywhere |
| Pull | Per table, `synced_at` cursor (10 s overlap), pages of 500 keyed on (synced_at, id). Skips records with a local change waiting |
| Photos | Uploaded to `photos/{user}/{id}`; other devices download missing ones after a pull |
| When | On sign-in, 1.5 s after any change, when the app comes back to the screen, when back online, every 60 s while open, and "Sync now" |
| First sign-in on a device | Account empty → uploads everything on the device (the phone's existing data). Account has data → device takes the account's data (old local copy kept in meta `presync`) |
| Mapping | App field ⇄ column by type; anything that doesn't fit (e.g. `''` in a number) is kept as-is in `extra`. Tested lossless on sample data of all 15 collections |
| Sign out | Settings → Your data. Warns if changes haven't synced, then clears this device |

## Free plan limits (checked 30 Oct)
| Limit | Value | Risk for Life Book |
|---|---|---|
| Inactivity pause | after ~7 days of low activity | Low if used daily. Restore from dashboard within 90 days |
| Database | 500 MB | Fine (text data) |
| Storage | 1 GB | ~5,000+ photos at ~200 KB. Keep compressing photos before upload |
| Egress | 5 GB / month | Fine if the app caches photos locally |
| Backups | none downloadable on Free | **Keep the in-app JSON backup** |

## Verified (30 Oct)
RLS isolation (user B can't read, edit, write as, or link to user A's rows), stale-write guard, FK set-null on purge. Security advisor: 0 issues.
