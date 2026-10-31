-- Run this in Supabase Dashboard > SQL Editor.
-- Replace 'YOUR_USER_UUID_HERE' below with your actual Supabase User ID (UUID).

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  author text not null default '',
  category text not null default 'Other' check (category in ('Programming','Science','Literature','Other')),
  description text not null default '',
  file_path text not null,
  created_by uuid not null default '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

-- Everyone may view book metadata.
drop policy if exists "Anyone can view book metadata" on public.books;
create policy "Anyone can view book metadata" on public.books
for select using (true);

-- Only the specified User ID can insert books
drop policy if exists "Only admin can insert books" on public.books;
create policy "Only admin can insert books" on public.books
for insert to authenticated
with check (auth.uid() = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid and created_by = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid);

-- Only the specified User ID can update books
drop policy if exists "Only admin can update books" on public.books;
create policy "Only admin can update books" on public.books
for update to authenticated
using (auth.uid() = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid)
with check (auth.uid() = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid);

-- Only the specified User ID can delete books
drop policy if exists "Only admin can delete books" on public.books;
create policy "Only admin can delete books" on public.books
for delete to authenticated
using (auth.uid() = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid);

-- Storage policies for the specified User ID
drop policy if exists "Admin uploads book PDFs" on storage.objects;
create policy "Admin uploads book PDFs" on storage.objects
for insert to authenticated
with check (bucket_id = 'Ayon Books' and auth.uid() = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid);

drop policy if exists "Readers can download book PDFs" on storage.objects;
create policy "Readers can download book PDFs" on storage.objects
for select to anon, authenticated
using (bucket_id = 'Ayon Books');

drop policy if exists "Admin deletes book PDFs" on storage.objects;
create policy "Admin deletes book PDFs" on storage.objects
for delete to authenticated
using (bucket_id = 'Ayon Books' and auth.uid() = '1614d6dc-07ef-42c6-878e-4d69714a86a3'::uuid);
