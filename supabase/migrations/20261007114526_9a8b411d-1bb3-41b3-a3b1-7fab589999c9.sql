drop function public.is_member(uuid);
create or replace function public.am_i_member() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin') or exists(
    select 1 from public.waitlist w join auth.users u on lower(u.email) = lower(w.email)
    where u.id = auth.uid() and w.status = 'approved')
$$;
revoke execute on function public.am_i_member() from public, anon;