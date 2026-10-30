-- বইঘর: Supabase SQL Editor-এ পুরো script চালান।
-- Admin role MUST be set in auth.users.app_metadata by a trusted admin/server action.
-- Do not set the role in user_metadata and never expose the service_role key in browser code.

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default 'সাধারণ' check (char_length(category) <= 60),
  item_type text not null check (item_type in ('book','video')),
  storage_path text not null unique,
  mime_type text,
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

drop policy if exists "Signed-in users can read library metadata" on public.library_items;
create policy "Signed-in users can read library metadata"
on public.library_items for select to authenticated using (true);

drop policy if exists "Admins can add library metadata" on public.library_items;
create policy "Admins can add library metadata"
on public.library_items for insert to authenticated
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and created_by = auth.uid()
);

drop policy if exists "Admins can delete library metadata" on public.library_items;
create policy "Admins can delete library metadata"
on public.library_items for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Private bucket. Never make this bucket public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library-files', 'library-files', false, 52428800,
  array['application/pdf','video/mp4','video/webm'])
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array['application/pdf','video/mp4','video/webm'];

drop policy if exists "Signed-in users can read library files" on storage.objects;
create policy "Signed-in users can read library files"
on storage.objects for select to authenticated
using (bucket_id = 'library-files');

drop policy if exists "Admins can upload library files" on storage.objects;
create policy "Admins can upload library files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'library-files'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins can delete library files" on storage.objects;
create policy "Admins can delete library files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'library-files'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Note: OAuth provider setup and secure admin-role assignment are described in README.md.
-- This setup intentionally does not allow users to edit/replace metadata or grant themselves admin.
