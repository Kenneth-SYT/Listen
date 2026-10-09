create or replace function public.public_session_rates()
returns table (
  rate_code text,
  label text,
  amount_cents integer,
  duration_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rates.code as rate_code,
    rates.label,
    rates.amount_cents,
    rates.duration_minutes
  from public.rates
  where rates.code in ('intro', 'standard', 'extended')
  order by rates.duration_minutes;
$$;

revoke all on function public.public_session_rates() from public;
grant execute on function public.public_session_rates() to anon, authenticated;

