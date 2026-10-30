-- Life Book schema v1 (30 Oct 2026). One table per app collection.
-- Every row: user_id + app id (PK), created_at, updated_at (device time, newest wins),
-- deleted_at (soft delete), synced_at (server time, pull cursor), extra (app fields without a column).

create or replace function public.lb_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    -- An older edit arriving late from an offline device never overwrites a newer one.
    if new.updated_at < old.updated_at then return null; end if;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  new.synced_at := now();
  return new;
end $$;

create table public.settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  data jsonb not null default '{}',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.settings is $c$App collection 'settings'. Single record id='main' (settings/main). Whole settings doc in data: incomes, incomeLog, budgets, bills, noteTags, themes, targets.$c$;
create index settings_sync_idx on public.settings (user_id, synced_at);
create trigger settings_touch before insert or update on public.settings for each row execute function public.lb_touch();
alter table public.settings enable row level security;
create policy settings_select on public.settings for select to authenticated using (user_id = (select auth.uid()));
create policy settings_insert on public.settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy settings_update on public.settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy settings_delete on public.settings for delete to authenticated using (user_id = (select auth.uid()));

create table public.debts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  name text not null default '', currency text not null default 'NIS' check (currency in ('NIS','USD')), total numeric(12,2), paid_before numeric(12,2), sort_order integer,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.debts is $c$App collection 'debts'. Debts. Left = total - paid_before - sum(entries.amount where debt_id).$c$;
create index debts_sync_idx on public.debts (user_id, synced_at);
create trigger debts_touch before insert or update on public.debts for each row execute function public.lb_touch();
alter table public.debts enable row level security;
create policy debts_select on public.debts for select to authenticated using (user_id = (select auth.uid()));
create policy debts_insert on public.debts for insert to authenticated with check (user_id = (select auth.uid()));
create policy debts_update on public.debts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy debts_delete on public.debts for delete to authenticated using (user_id = (select auth.uid()));

create table public.people (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  name text not null default '', rel text, partner boolean not null default false, birthday text, notes text, gift_budget numeric(12,2), dates jsonb not null default '[]', favs jsonb not null default '[]', wants jsonb not null default '[]', gifts jsonb not null default '[]',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.people is $c$App collection 'people'. People. birthday kept as text (can be blank or yearless).$c$;
create index people_sync_idx on public.people (user_id, synced_at);
create trigger people_touch before insert or update on public.people for each row execute function public.lb_touch();
alter table public.people enable row level security;
create policy people_select on public.people for select to authenticated using (user_id = (select auth.uid()));
create policy people_insert on public.people for insert to authenticated with check (user_id = (select auth.uid()));
create policy people_update on public.people for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy people_delete on public.people for delete to authenticated using (user_id = (select auth.uid()));

create table public.products (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  name text not null default '', brand text, size text, notes text, photo text, status text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.products is $c$App collection 'products'. Kitchen products. photo = asset id in Storage photos/{user_id}/{id}.$c$;
create index products_sync_idx on public.products (user_id, synced_at);
create trigger products_touch before insert or update on public.products for each row execute function public.lb_touch();
alter table public.products enable row level security;
create policy products_select on public.products for select to authenticated using (user_id = (select auth.uid()));
create policy products_insert on public.products for insert to authenticated with check (user_id = (select auth.uid()));
create policy products_update on public.products for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy products_delete on public.products for delete to authenticated using (user_id = (select auth.uid()));

create table public.entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  amount numeric(12,2) not null default 0, cat text not null default 'other', note text, date date not null, orig_amt numeric(12,2), debt_id text, bill_id text, person_id text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.entries is $c$App collection 'entries'. Spending in NIS. cat = category id from the app's CATS list. bill_id points into settings.data.bills[].id (no FK).$c$;
create index entries_sync_idx on public.entries (user_id, synced_at);
create trigger entries_touch before insert or update on public.entries for each row execute function public.lb_touch();
alter table public.entries enable row level security;
create policy entries_select on public.entries for select to authenticated using (user_id = (select auth.uid()));
create policy entries_insert on public.entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy entries_update on public.entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy entries_delete on public.entries for delete to authenticated using (user_id = (select auth.uid()));

create table public.wishes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  cat text, name text not null default '', type text, color text, price numeric(12,2), cur text, where_from text, added date, status text not null default 'waiting' check (status in ('waiting','bought','skipped')), decided date,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.wishes is $c$App collection 'wishes'. Wishlist. where_from = app field 'where'.$c$;
create index wishes_sync_idx on public.wishes (user_id, synced_at);
create trigger wishes_touch before insert or update on public.wishes for each row execute function public.lb_touch();
alter table public.wishes enable row level security;
create policy wishes_select on public.wishes for select to authenticated using (user_id = (select auth.uid()));
create policy wishes_insert on public.wishes for insert to authenticated with check (user_id = (select auth.uid()));
create policy wishes_update on public.wishes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wishes_delete on public.wishes for delete to authenticated using (user_id = (select auth.uid()));

create table public.food_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  date date not null, meal text check (meal in ('breakfast','lunch','dinner','snack')), name text not null default '', plan boolean, kcal numeric(8,1),
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.food_logs is $c$App collection 'food'. Food diary.$c$;
create index food_logs_sync_idx on public.food_logs (user_id, synced_at);
create trigger food_logs_touch before insert or update on public.food_logs for each row execute function public.lb_touch();
alter table public.food_logs enable row level security;
create policy food_logs_select on public.food_logs for select to authenticated using (user_id = (select auth.uid()));
create policy food_logs_insert on public.food_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy food_logs_update on public.food_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy food_logs_delete on public.food_logs for delete to authenticated using (user_id = (select auth.uid()));

create table public.weights (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  date date not null, kg numeric(5,2) not null,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.weights is $c$App collection 'weights'. One weigh-in per day; id = 'w-YYYY-MM-DD'.$c$;
create index weights_sync_idx on public.weights (user_id, synced_at);
create trigger weights_touch before insert or update on public.weights for each row execute function public.lb_touch();
alter table public.weights enable row level security;
create policy weights_select on public.weights for select to authenticated using (user_id = (select auth.uid()));
create policy weights_insert on public.weights for insert to authenticated with check (user_id = (select auth.uid()));
create policy weights_update on public.weights for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy weights_delete on public.weights for delete to authenticated using (user_id = (select auth.uid()));

create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  date date not null, data jsonb not null default '{}',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.day_logs is $c$App collection 'days'. One record per day (id = 'YYYY-MM-DD'): water, vitamins, rope, habit ticks, prayers (pr), tasbih (tb), sleep, mood, cycle notes in data.$c$;
create index day_logs_sync_idx on public.day_logs (user_id, synced_at);
create trigger day_logs_touch before insert or update on public.day_logs for each row execute function public.lb_touch();
alter table public.day_logs enable row level security;
create policy day_logs_select on public.day_logs for select to authenticated using (user_id = (select auth.uid()));
create policy day_logs_insert on public.day_logs for insert to authenticated with check (user_id = (select auth.uid()));
create policy day_logs_update on public.day_logs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy day_logs_delete on public.day_logs for delete to authenticated using (user_id = (select auth.uid()));

create table public.cycles (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  start_date date not null, end_date date,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.cycles is $c$App collection 'cycle'. Periods.$c$;
create index cycles_sync_idx on public.cycles (user_id, synced_at);
create trigger cycles_touch before insert or update on public.cycles for each row execute function public.lb_touch();
alter table public.cycles enable row level security;
create policy cycles_select on public.cycles for select to authenticated using (user_id = (select auth.uid()));
create policy cycles_insert on public.cycles for insert to authenticated with check (user_id = (select auth.uid()));
create policy cycles_update on public.cycles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy cycles_delete on public.cycles for delete to authenticated using (user_id = (select auth.uid()));

create table public.prices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  item text not null default '', unit text, ppu numeric(12,4), date date,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.prices is $c$App collection 'prices'. Price per unit (NIS).$c$;
create index prices_sync_idx on public.prices (user_id, synced_at);
create trigger prices_touch before insert or update on public.prices for each row execute function public.lb_touch();
alter table public.prices enable row level security;
create policy prices_select on public.prices for select to authenticated using (user_id = (select auth.uid()));
create policy prices_insert on public.prices for insert to authenticated with check (user_id = (select auth.uid()));
create policy prices_update on public.prices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy prices_delete on public.prices for delete to authenticated using (user_id = (select auth.uid()));

create table public.recipes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  title text not null default '', servings numeric(6,2), time text, plan text, for_him boolean not null default false, ingredients jsonb not null default '[]', steps jsonb not null default '[]', tips jsonb not null default '[]', photo text, made integer not null default 0, last_made date,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.recipes is $c$App collection 'recipes'. Recipes. ingredients = [{qty,unit,name,product_id}].$c$;
create index recipes_sync_idx on public.recipes (user_id, synced_at);
create trigger recipes_touch before insert or update on public.recipes for each row execute function public.lb_touch();
alter table public.recipes enable row level security;
create policy recipes_select on public.recipes for select to authenticated using (user_id = (select auth.uid()));
create policy recipes_insert on public.recipes for insert to authenticated with check (user_id = (select auth.uid()));
create policy recipes_update on public.recipes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy recipes_delete on public.recipes for delete to authenticated using (user_id = (select auth.uid()));

create table public.closet_items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  name text not null default '', type text, color text, fit text, clean boolean, plan text, orig text, photo text, crop jsonb, bright boolean not null default false, status text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.closet_items is $c$App collection 'closet'. Closet. orig/photo = asset ids.$c$;
create index closet_items_sync_idx on public.closet_items (user_id, synced_at);
create trigger closet_items_touch before insert or update on public.closet_items for each row execute function public.lb_touch();
alter table public.closet_items enable row level security;
create policy closet_items_select on public.closet_items for select to authenticated using (user_id = (select auth.uid()));
create policy closet_items_insert on public.closet_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy closet_items_update on public.closet_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy closet_items_delete on public.closet_items for delete to authenticated using (user_id = (select auth.uid()));

create table public.date_nights (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  date date, idea text, note text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.date_nights is $c$App collection 'dates'. Date nights / memory jar.$c$;
create index date_nights_sync_idx on public.date_nights (user_id, synced_at);
create trigger date_nights_touch before insert or update on public.date_nights for each row execute function public.lb_touch();
alter table public.date_nights enable row level security;
create policy date_nights_select on public.date_nights for select to authenticated using (user_id = (select auth.uid()));
create policy date_nights_insert on public.date_nights for insert to authenticated with check (user_id = (select auth.uid()));
create policy date_nights_update on public.date_nights for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy date_nights_delete on public.date_nights for delete to authenticated using (user_id = (select auth.uid()));

create table public.notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  text text, tag text, pinned boolean not null default false, url text, label text, photo text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
comment on table public.notes is $c$App collection 'notes'. Notes chat. tag = id from settings.data.noteTags.$c$;
create index notes_sync_idx on public.notes (user_id, synced_at);
create trigger notes_touch before insert or update on public.notes for each row execute function public.lb_touch();
alter table public.notes enable row level security;
create policy notes_select on public.notes for select to authenticated using (user_id = (select auth.uid()));
create policy notes_insert on public.notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy notes_update on public.notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notes_delete on public.notes for delete to authenticated using (user_id = (select auth.uid()));

alter table public.settings add constraint settings_one check (id = 'main');
create unique index weights_one_per_day on public.weights (user_id, date) where deleted_at is null;
create unique index day_logs_one_per_day on public.day_logs (user_id, date) where deleted_at is null;
create index entries_date_idx on public.entries (user_id, date);
create index food_logs_date_idx on public.food_logs (user_id, date);

-- Links. App deletes are soft (undo keeps working); these only act on a hard purge.
alter table public.entries add constraint entries_debt_fk foreign key (user_id, debt_id) references public.debts (user_id, id) on delete set null (debt_id);
alter table public.entries add constraint entries_person_fk foreign key (user_id, person_id) references public.people (user_id, id) on delete set null (person_id);
create index entries_debt_idx on public.entries (user_id, debt_id) where debt_id is not null;
create index entries_person_idx on public.entries (user_id, person_id) where person_id is not null;

-- Photos: private bucket, each user only sees photos/{their user id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy photos_select on storage.objects for select to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_insert on storage.objects for insert to authenticated with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_update on storage.objects for update to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_delete on storage.objects for delete to authenticated using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
