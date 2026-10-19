-- Ejecutar en Supabase SQL Editor cuando se conecte la app.
create table profiles (id uuid primary key references auth.users on delete cascade, display_name text not null, family_id uuid not null);
create table events (id uuid primary key default gen_random_uuid(), family_id uuid not null, owner_id uuid not null references auth.users, title text not null, event_date date not null, event_time time, category text, visibility text not null check (visibility in ('family','private')), reminder_minutes integer default 0, created_at timestamptz default now());
create table notes (id uuid primary key default gen_random_uuid(), family_id uuid not null, owner_id uuid not null references auth.users, title text, body text, visibility text not null check (visibility in ('family','private')), updated_at timestamptz default now());
create table products (id uuid primary key default gen_random_uuid(), family_id uuid not null, name text not null, category text, purchase_count integer default 0, last_bought_at timestamptz);
create table shopping_items (id uuid primary key default gen_random_uuid(), family_id uuid not null, product_id uuid references products on delete set null, name text not null, quantity text, category text, done boolean default false, created_by uuid not null references auth.users, created_at timestamptz default now());
alter table profiles enable row level security; alter table events enable row level security; alter table notes enable row level security; alter table products enable row level security; alter table shopping_items enable row level security;
create policy "profile-self" on profiles for select using (id=auth.uid());
create policy "events-visible" on events for select using (owner_id=auth.uid() or (visibility='family' and family_id=(select family_id from profiles where id=auth.uid())));
create policy "events-own-write" on events for all using (owner_id=auth.uid()) with check (owner_id=auth.uid() and family_id=(select family_id from profiles where id=auth.uid()));
create policy "notes-visible" on notes for select using (owner_id=auth.uid() or (visibility='family' and family_id=(select family_id from profiles where id=auth.uid())));
create policy "notes-own-write" on notes for all using (owner_id=auth.uid()) with check (owner_id=auth.uid() and family_id=(select family_id from profiles where id=auth.uid()));
create policy "products-family" on products for all using (family_id=(select family_id from profiles where id=auth.uid())) with check (family_id=(select family_id from profiles where id=auth.uid()));
create policy "shopping-family" on shopping_items for all using (family_id=(select family_id from profiles where id=auth.uid())) with check (family_id=(select family_id from profiles where id=auth.uid()));
