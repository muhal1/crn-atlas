create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Kullanıcı',
  alinan jsonb not null default '[]'::jsonb,
  secim jsonb not null default '{"aktif":"Program 1","profiller":[{"ad":"Program 1","crnler":[]}]}'::jsonb,
  gizlenen jsonb not null default '[]'::jsonb,
  kapali_branslar jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
revoke all on table public.user_profiles from anon, authenticated;
grant select, insert, update, delete on table public.user_profiles to authenticated;

drop policy if exists "Kullanıcı kendi profilini okuyabilir" on public.user_profiles;
create policy "Kullanıcı kendi profilini okuyabilir"
on public.user_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Kullanıcı kendi profilini oluşturabilir" on public.user_profiles;
create policy "Kullanıcı kendi profilini oluşturabilir"
on public.user_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Kullanıcı kendi profilini güncelleyebilir" on public.user_profiles;
create policy "Kullanıcı kendi profilini güncelleyebilir"
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Kullanıcı kendi profilini silebilir" on public.user_profiles;
create policy "Kullanıcı kendi profilini silebilir"
on public.user_profiles for delete to authenticated
using ((select auth.uid()) = user_id);
