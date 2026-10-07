alter table public.profiles add column state text, add column education_level text, add column field_of_study text, add column daily_goal int not null default 10;
alter table public.grants add column grant_type text not null default 'business', add column verification text not null default 'unverified', add column verification_note text;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null, email text not null unique, phone text, state text, reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now());
grant insert on public.waitlist to anon, authenticated;
grant select, update, delete on public.waitlist to authenticated;
grant all on public.waitlist to service_role;
alter table public.waitlist enable row level security;
create policy "anyone joins waitlist" on public.waitlist for insert to anon, authenticated with check (status = 'pending');
create policy "admins manage waitlist" on public.waitlist for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.is_member(_user_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,'admin') or exists(
    select 1 from public.waitlist w join auth.users u on lower(u.email) = lower(w.email)
    where u.id = _user_id and w.status = 'approved')
$$;
revoke execute on function public.is_member(uuid) from public, anon;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, grant_id uuid not null references public.grants(id) on delete cascade,
  status text not null default 'saved', applied_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, grant_id));
grant select, insert, update, delete on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "own applications" on public.applications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, author_name text not null, title text not null, body text not null, grant_name text,
  approved boolean not null default false,
  created_at timestamptz not null default now());
grant select on public.stories to anon, authenticated;
grant insert, update, delete on public.stories to authenticated;
grant all on public.stories to service_role;
alter table public.stories enable row level security;
create policy "approved stories public" on public.stories for select to anon, authenticated using (approved = true);
create policy "own stories read" on public.stories for select to authenticated using (user_id = auth.uid());
create policy "own stories insert" on public.stories for insert to authenticated with check (user_id = auth.uid() and approved = false);
create policy "admins manage stories" on public.stories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));