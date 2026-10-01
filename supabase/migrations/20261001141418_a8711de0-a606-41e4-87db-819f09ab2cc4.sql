create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, country text, age int, business_name text, business_stage text, industry text, annual_revenue text, story text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create table public.grants (
  id uuid primary key default gen_random_uuid(),
  title text not null, funder text not null, amount text, deadline date, link text,
  summary text, eligibility text, funder_background text,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now());
grant select on public.grants to authenticated, anon;
grant insert, update, delete on public.grants to authenticated;
grant all on public.grants to service_role;
alter table public.grants enable row level security;
create policy "grants public read" on public.grants for select to anon, authenticated using (true);
create policy "admins manage grants" on public.grants for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_id uuid not null references public.grants(id) on delete cascade,
  question text not null, answer text not null,
  created_at timestamptz not null default now());
grant select, insert, delete on public.drafts to authenticated;
grant all on public.drafts to service_role;
alter table public.drafts enable row level security;
create policy "own drafts" on public.drafts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  if (select count(*) from public.user_roles where role='admin') = 0 then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.grants (title, funder, amount, deadline, link, summary, eligibility, funder_background, questions) values
('Women Founders Growth Grant','Global Women Enterprise Fund','$10,000','2026-12-15','https://example.org/wfgg','Unrestricted funding for women-owned small businesses ready to grow.','Woman-owned (51%+), operating at least 1 year, annual revenue under $500k, any country.','Funds practical, community-rooted businesses. Past winners: food processing, tailoring, agritech in Africa and Asia. Values clear numbers and job creation.','["Tell us about your business (max 300 words)","How will you use the grant? (max 500 words)"]'),
('Young Women in Tech Award','Bright Future Foundation','$5,000','2026-11-30','https://example.org/ywta','Award for women aged 18-35 building technology products.','Women aged 18-35, tech product or startup at idea or early stage.','Backs bold early ideas and personal stories of resilience. Favors applicants with a working prototype.','["Personal statement (max 500 words)","Describe your product and the problem it solves (max 300 words)"]'),
('Rural Women Agribusiness Fund','AgriRise Africa','$3,000','2027-01-31','https://example.org/rwaf','Support for women farmers and agro-processors in Sub-Saharan Africa.','Women in Sub-Saharan Africa running a farm or agribusiness; rural location preferred.','Works through cooperatives; past winners show local impact and sustainability. Simple, honest writing scores well.','["Describe your farm or agribusiness (max 300 words)","What impact will this grant have on your community? (max 400 words)"]');