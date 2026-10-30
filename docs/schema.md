# Supabase schema (draft for review, 30 Oct 2026)

## Rules for every table
- `id text` primary key (keeps the app's existing ids so the backup imports as-is)
- `user_id uuid` → auth.users, row-level security: `user_id = auth.uid()`
- `created_at`, `updated_at` (newest wins when syncing), `deleted_at` (soft delete, so offline devices don't resurrect deleted rows)
- Photos: private Storage bucket `photos/{user_id}/{id}.jpg`; tables store `photo_path`

## Tables
| Group | Table | Columns |
|---|---|---|
| Settings | `settings` (PK user_id) | rate, elec_rate, water_target, rope_target, vitd_days, vitd_dose, sleep_goal, height_cm, goal_kg, journey_start, journey_low, pray_start, no_spend, debt_sort, prefs jsonb |
| Money | `entries` | amount, category, note, date, orig_amount, orig_currency, debt_id?, bill_id?, person_id? |
| | `debts` | name, currency, total, paid_before, sort_order |
| | `bills` | name, amount, category, due_day |
| | `budgets` | category, amount · unique(user, category) |
| | `incomes` | (fields to confirm from code) |
| | `income_log` | date, for_month, cycle |
| | `wishes` | category, name, type, color, price, currency, where_from, status, decided_at, entry_id? |
| Health | `day_logs` (PK user_id+date) | water, vit_d, folic, rope, bed, wake, mood, flow, symptoms[], note, prayers jsonb, tasbih jsonb, habits jsonb |
| | `weights` | date (unique per user), kg |
| | `food_logs` | date, meal, name, on_plan, kcal |
| | `cycles` | start_date, end_date |
| Home | `products` | name, brand, size, notes, photo_path, status |
| | `prices` | item, unit, price_per_unit, date, product_id? |
| | `recipes` | title, servings, time, plan, for_him, steps[], tips[], photo_path, times_made, last_made |
| | `recipe_ingredients` | recipe_id, qty, unit, name, product_id?, sort_order |
| | `closet_items` | name, type, color, fit, clean, plan, orig_path, photo_path, crop jsonb, bright, status |
| | `people` | name, relation, is_partner, birthday, notes, favs[], wants[], gift_budget |
| | `person_dates` | person_id, label, date |
| | `gifts` | person_id, name, price, date, entry_id? |
| | `date_nights` | date, idea, note, person_id? |
| | `notes` | text, tag_id?, pinned, url, ai_label, photo_path |
| | `note_tags` | name, color, sort_order |

## Relations
| From | To | On parent delete |
|---|---|---|
| entries.debt_id | debts | set null (open: or block) |
| entries.bill_id | bills | set null |
| entries.person_id | people | set null |
| wishes.entry_id | entries | set null (new) |
| prices.product_id | products | set null (new) |
| recipe_ingredients.recipe_id | recipes | cascade |
| recipe_ingredients.product_id | products | set null |
| person_dates.person_id, gifts.person_id | people | cascade |
| gifts.entry_id | entries | set null (new) |
| date_nights.person_id | people | set null |
| notes.tag_id | note_tags | set null |

## Open
- Categories: plain text, or a `categories` table (needed if categories get renamed)?
- Data source for import: the phone app backup (includes photos as `blobs`).
