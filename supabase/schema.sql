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

-- Bu ekleme mevcut hesapların ders seçimlerini değiştirmez.
alter table public.user_profiles
  add column if not exists academic_profile jsonb not null default '{}'::jsonb;

-- Katalog yalnızca yönetici SQL işlemleriyle güncellenir. Tarayıcı salt okunur.
create table if not exists public.academics (
  id text primary key,
  name text not null,
  title text not null,
  department text not null,
  topics text[] not null default '{}'::text[],
  source_url text not null,
  topic_source_url text,
  verified_on date not null
);

-- Bu eklemeler mevcut kayıtları değiştirmez; Hoca-Bilgileri md dosyalarındaki
-- genel profil, ikincil/uygulama alanları, teknolojiler ve tez yönü bilgisi içindir.
alter table public.academics
  add column if not exists description text,
  add column if not exists secondary_topics text[] not null default '{}'::text[],
  add column if not exists application_areas text[] not null default '{}'::text[],
  add column if not exists technologies text,
  add column if not exists recent_directions text[] not null default '{}'::text[],
  add column if not exists thesis_directions text[] not null default '{}'::text[];

alter table public.academics enable row level security;
revoke all on table public.academics from anon, authenticated;
grant select on table public.academics to authenticated;
drop policy if exists "Giriş yapanlar akademik kataloğu okuyabilir" on public.academics;
create policy "Giriş yapanlar akademik kataloğu okuyabilir"
on public.academics for select to authenticated using (true);
