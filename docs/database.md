# Database (Supabase / PostgreSQL)

The app has no custom backend server — it talks directly to a [Supabase](https://supabase.com)
project (hosted PostgreSQL + Auth + auto-generated APIs) from `src/services/*.ts`. Every table has
Row Level Security (RLS) enabled, so the database itself — not just the app's code — enforces who
can see or change what. This matters because the app connects with a public "anon" key
(`EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`), which is visible to anyone who inspects the app's
network traffic; RLS is what makes that safe.

All schema changes are tracked as numbered SQL files in
[supabase/migrations/](../supabase/migrations), applied in order. This document summarises the
current end-state of the schema; read the individual migration files for the full history/reasoning
behind each change.

---

## Tables

### `categories`
Product categories shown on Home/Shop (e.g. Health & Wellness, Beauty & Skincare).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | e.g. "Health & Wellness" |
| `image_url` | TEXT | Banner image |
| `created_at` | TIMESTAMPTZ | |

**Access:** Publicly readable by anyone (signed in or not). **Not writable from the client at
all** — catalog changes are made directly in the database/dashboard, never by the app.

### `products`
The full product catalog.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name`, `description` | TEXT | |
| `price` | DECIMAL(10,2) | Source of truth for price — never trusted from the client at checkout |
| `currency` | TEXT | Defaults to `'GBP'` |
| `image_url` | TEXT | |
| `category_id` | UUID | FK → `categories.id` |
| `stock_quantity` | INT | |
| `is_active` | BOOLEAN | Inactive products are filtered out everywhere (cart, catalog, checkout) |
| `created_at` | TIMESTAMPTZ | |

**Access:** Publicly readable. Not writable from the client.

### `users`
One profile row per Supabase Auth account (the app's own `users` table, separate from Supabase's
internal `auth.users`).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, **same value as** `auth.users.id` |
| `full_name`, `email`, `phone` | TEXT | |
| `advantage_card_number` | TEXT | Unique 16-digit loyalty card number, auto-generated |
| `loyalty_points` | INT | Defaults to `0` |
| `created_at` | TIMESTAMPTZ | |

**Access:** A user can only read/update their **own** row (`auth.uid() = id`). Column-level
privileges additionally restrict which columns a user is even allowed to `UPDATE` —
`full_name` and `phone` only. `loyalty_points`, `advantage_card_number`, and `email` **cannot be
changed by the client at all**, even via a crafted request, because the database itself only
grants `UPDATE` on those two specific columns.

**How rows get created:** Not by the app inserting a row after sign-up — a Postgres trigger
(`handle_new_user`, added by
[20260924000000_create_user_profile_on_signup.sql](../supabase/migrations/20260924000000_create_user_profile_on_signup.sql))
fires automatically whenever a new row is created in Supabase's internal `auth.users`, in the same
database transaction. This avoids a race condition: if "confirm email" is turned on, `signUp()`
returns no session, so the client would still be anonymous and unable to satisfy an
`auth.uid() = id` insert policy.

### `orders`
One row per placed order.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id` |
| `order_number` | TEXT | Unique, customer-facing (e.g. `BOOTS123456`) |
| `total_amount`, `subtotal`, `discount_amount`, `delivery_fee` | DECIMAL(10,2) | All computed server-side, never from the client |
| `currency` | TEXT | Defaults to `'GBP'` |
| `status` | TEXT | Defaults to `'pending'` |
| `delivery_method` | TEXT | `'standard'` or `'express'` |
| `points_earned` | INT | Loyalty points this order awarded |
| `shipping_address` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

**Access:** A user can `INSERT`/`SELECT` only their **own** orders. **No `UPDATE` or `DELETE`
policy exists at all** — once placed, an order is permanently read-only from the client's
perspective (added in
[20261001000000_lock_points_and_orders.sql](../supabase/migrations/20261001000000_lock_points_and_orders.sql)).

### `order_items`
Line items belonging to an order (product + quantity + price at time of purchase).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | UUID | FK → `orders.id` |
| `product_id` | UUID | FK → `products.id` |
| `quantity` | INT | |
| `price` | DECIMAL(10,2) | Snapshotted at purchase time, so later price changes don't rewrite history |

**Access:** Visible/insertable only through an order the user owns (checked via an `EXISTS`
subquery against `orders`). No `UPDATE`/`DELETE`.

### `cart`
The live shopping basket — one row per (user, product) pair.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id` |
| `product_id` | UUID | FK → `products.id` |
| `quantity` | INT | Defaults to `1` |
| `created_at` | TIMESTAMPTZ | |

**Access:** Full `SELECT`/`INSERT`/`UPDATE`/`DELETE`, but only on the user's **own** rows.

### `favourites`
Added in
[20260925000000_create_favourites.sql](../supabase/migrations/20260925000000_create_favourites.sql).
Which products a user has hearted.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id`, cascades on delete |
| `product_id` | UUID | FK → `products.id`, cascades on delete |
| `created_at` | TIMESTAMPTZ | |
| — | — | `UNIQUE (user_id, product_id)` — a product can only be favourited once per user |

**Access:** Full manage (`FOR ALL`) but only on the user's own rows.

---

## Server-side business logic: `place_order()`

Added in
[20260930000000_checkout.sql](../supabase/migrations/20260930000000_checkout.sql), this is a
Postgres function (called via `supabase.rpc('place_order', ...)` from
[src/services/orders.ts](../src/services/orders.ts)) that does **everything checkout needs in one
atomic database transaction**:

1. Reads the caller's cart, joined against `products`, to compute the subtotal — **from the
   database's current price**, never from anything the client sends.
2. Validates the promo code server-side (`BOOTS10` = 10% off; anything else is rejected).
3. Computes delivery fee (free over £25, else £2.99 standard / £4.99 express).
4. Computes loyalty points earned (4 points per £1 spent on goods, not on delivery).
5. Inserts the `orders` row and matching `order_items` rows.
6. Adds the earned points onto the user's `loyalty_points`.
7. Empties the user's cart.
8. Returns a JSON summary (order number, totals, points earned/new balance) back to the app.

**Why this matters:** if any one of these steps failed halfway (e.g. the app crashed after
creating the order but before clearing the cart), a naive multi-step client implementation could
double-charge points or leave a half-finished order. Doing it all inside one Postgres function
means it's all-or-nothing.

The function runs with `SECURITY DEFINER` (added in the lock-down migration below) specifically so
it's allowed to update `loyalty_points` even though the client itself has no permission to touch
that column directly — the *function* is trusted, the *client* is not.

---

## Migration history (chronological)

| File | What it did |
|---|---|
| [20260923000000_initial_schema.sql](../supabase/migrations/20260923000000_initial_schema.sql) | Created the 6 core tables (`categories`, `products`, `users`, `orders`, `order_items`, `cart`) and their initial RLS policies |
| [20260924000000_create_user_profile_on_signup.sql](../supabase/migrations/20260924000000_create_user_profile_on_signup.sql) | Added the `handle_new_user` trigger + 16-digit Advantage Card number generator, so every sign-up automatically gets a `users` profile row |
| [20260925000000_create_favourites.sql](../supabase/migrations/20260925000000_create_favourites.sql) | Added the `favourites` table |
| [20260926000000_dedupe_and_enrich_catalog.sql](../supabase/migrations/20260926000000_dedupe_and_enrich_catalog.sql) | Cleaned up duplicate catalog rows from repeated seeding and backfilled `image_url` |
| [20260927000000_boots_realistic_catalog.sql](../supabase/migrations/20260927000000_boots_realistic_catalog.sql) | Replaced placeholder categories with Boots UK's real category structure and real product ranges |
| [20260928000000_real_catalog_images.sql](../supabase/migrations/20260928000000_real_catalog_images.sql) | Replaced placeholder text-box images with real product photography |
| [20260929000000_unique_product_images.sql](../supabase/migrations/20260929000000_unique_product_images.sql) | Gave every product its own distinct photo instead of sharing one per category |
| [20260930000000_checkout.sql](../supabase/migrations/20260930000000_checkout.sql) | Added order columns (`order_number`, `points_earned`, etc.) and the `place_order()` function |
| [20260930000001_order_items_policies.sql](../supabase/migrations/20260930000001_order_items_policies.sql) | Fixed a live bug: `order_items` had RLS enabled but no policies, so every insert was silently denied |
| [20261001000000_lock_points_and_orders.sql](../supabase/migrations/20261001000000_lock_points_and_orders.sql) | Security hardening: locked `loyalty_points`/`advantage_card_number`/`email` to be non-editable by the client, and made placed `orders`/`order_items` fully read-only (no client `UPDATE`/`DELETE`) |

---

## Applying migrations

There is no automated CI pipeline running these yet — each migration file's header comment says
to either:
- Paste it into the Supabase Dashboard → **SQL Editor** → **Run**, or
- Use the Supabase CLI: `supabase db push` (requires linking the project with
  `supabase link`, which needs project credentials this environment doesn't have — see the
  comment at the top of each migration file).

`supabase/seed.sql` contains sample catalog data for a fresh database and is written to be safely
re-run (every insert is guarded with `NOT EXISTS`, so re-running it never creates duplicates).
