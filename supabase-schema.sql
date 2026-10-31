-- Run this in Supabase Dashboard > SQL Editor.
-- First create your account through Authentication > Users / sign-up.
-- Then replace ADMIN_EMAIL below with your own email and run the UPDATE.
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  author text not null default '',
  category text not null default 'Other' check (category in ('Programming','Science','Literature','Other')),
  description text not null default '',
  file_path text not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

-- Everyone may view book metadata.
drop policy if exists "Anyone can view book metadata" on public.books;
create policy "Anyone can view book metadata" on public.books
for select using (true);

-- IMPORTANT: Set your own email in the query below, then run it.
-- Do not leave the placeholder as your real admin email.
-- update public.books ... is not an admin policy; the admin role is stored in app_metadata.
-- Configure app_metadata.role = 'admin' for your user using a trusted server/admin workflow.
-- Never allow users to edit their own app_metadata from the browser.

drop policy if exists "Only admin can insert books" on public.books;
create policy "Only admin can insert books" on public.books
for insert to authenticated
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' and created_by = auth.uid());

drop policy if exists "Only admin can update books" on public.books;
create policy "Only admin can update books" on public.books
for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Only admin can delete books" on public.books;
create policy "Only admin can delete books" on public.books
for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Create a private Storage bucket named "books" in Storage dashboard.
-- Storage policies below only permit the admin role to upload/delete files.
drop policy if exists "Admin uploads book PDFs" on storage.objects;
create policy "Admin uploads book PDFs" on storage.objects
for insert to authenticated
with check (bucket_id = 'books' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Readers can download book PDFs" on storage.objects;
create policy "Readers can download book PDFs" on storage.objects
for select to anon, authenticated
using (bucket_id = 'books');

drop policy if exists "Admin deletes book PDFs" on storage.objects;
create policy "Admin deletes book PDFs" on storage.objects
for delete to authenticated
using (bucket_id = 'books' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
