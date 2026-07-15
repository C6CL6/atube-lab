create table public.vpn_payment_orders (
  id uuid primary key,
  client_request_id uuid not null unique,
  status_token_hash text not null,
  checkout_token_hash text not null,
  machine_code_hash text not null,
  authorization_request text not null,
  plan text not null check (plan in ('ten', 'month', 'quarter', 'year')),
  amount_fen integer not null check (amount_fen > 0),
  status text not null check (status in ('pending', 'paid', 'licensed', 'failed', 'cancelled', 'expired')),
  alipay_trade_no text unique,
  license_id uuid,
  license_key text,
  license_expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  licensed_at timestamptz,
  expires_at timestamptz not null
);

create table public.vpn_machine_trial_ledger (
  machine_code_hash text primary key,
  trial_bonus_consumed boolean not null default false,
  latest_license_expires_at timestamptz,
  first_issued_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.vpn_payment_orders enable row level security;
alter table public.vpn_machine_trial_ledger enable row level security;

create or replace function public.claim_vpn_payment_order(
  p_order_id uuid,
  p_alipay_trade_no text,
  p_license_id uuid
)
returns table (
  id uuid,
  status text,
  authorization_request text,
  machine_code_hash text,
  plan text,
  amount_fen integer,
  alipay_trade_no text,
  license_id uuid,
  license_expires_at timestamptz,
  trial_bonus_applied boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.vpn_payment_orders%rowtype;
  v_ledger public.vpn_machine_trial_ledger%rowtype;
  v_duration_days integer;
  v_base timestamptz;
  v_trial_bonus_applied boolean := false;
begin
  select * into v_order
  from public.vpn_payment_orders
  where vpn_payment_orders.id = p_order_id
  for update;

  if not found then
    raise exception 'payment order not found' using errcode = 'P0002';
  end if;

  if v_order.status not in ('pending', 'paid', 'licensed') then
    raise exception 'payment order is not claimable' using errcode = 'P0001';
  end if;

  if v_order.alipay_trade_no is not null and v_order.alipay_trade_no <> p_alipay_trade_no then
    raise exception 'payment order already belongs to another Alipay trade' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.vpn_payment_orders
    where alipay_trade_no = p_alipay_trade_no and vpn_payment_orders.id <> p_order_id
  ) then
    raise exception 'Alipay trade already claimed by another order' using errcode = '23505';
  end if;

  insert into public.vpn_machine_trial_ledger (machine_code_hash)
  values (v_order.machine_code_hash)
  on conflict (machine_code_hash) do update
    set updated_at = now()
  returning * into v_ledger;

  select * into v_ledger
  from public.vpn_machine_trial_ledger
  where machine_code_hash = v_order.machine_code_hash
  for update;

  if v_order.license_id is null then
    v_duration_days := case v_order.plan
      when 'ten' then 10
      when 'month' then 30
      when 'quarter' then 90
      when 'year' then 365
    end;
    v_base := greatest(coalesce(v_ledger.latest_license_expires_at + interval '1 second', now()), now());
    v_trial_bonus_applied := not v_ledger.trial_bonus_consumed;
    if v_trial_bonus_applied then
      v_duration_days := v_duration_days + 15;
    end if;

    update public.vpn_machine_trial_ledger
    set trial_bonus_consumed = trial_bonus_consumed or v_trial_bonus_applied,
        latest_license_expires_at = date_trunc('day', v_base) + make_interval(days => v_duration_days) - interval '1 second',
        first_issued_at = coalesce(first_issued_at, now()),
        updated_at = now()
    where machine_code_hash = v_order.machine_code_hash
    returning * into v_ledger;

    update public.vpn_payment_orders
    set status = 'paid',
        alipay_trade_no = p_alipay_trade_no,
        license_id = p_license_id,
        license_expires_at = v_ledger.latest_license_expires_at,
        paid_at = coalesce(paid_at, now())
    where vpn_payment_orders.id = p_order_id
    returning * into v_order;
  else
    update public.vpn_payment_orders
    set status = case when status = 'licensed' then 'licensed' else 'paid' end,
        alipay_trade_no = p_alipay_trade_no,
        paid_at = coalesce(paid_at, now())
    where vpn_payment_orders.id = p_order_id
    returning * into v_order;
  end if;

  return query select
    v_order.id,
    v_order.status,
    v_order.authorization_request,
    v_order.machine_code_hash,
    v_order.plan,
    v_order.amount_fen,
    v_order.alipay_trade_no,
    v_order.license_id,
    v_order.license_expires_at,
    v_trial_bonus_applied;
end;
$$;

create or replace function public.complete_vpn_payment_license(
  p_order_id uuid,
  p_license_id uuid,
  p_license_key text
)
returns table (id uuid, status text, license_id uuid, license_key text, license_expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.vpn_payment_orders%rowtype;
begin
  select * into v_order
  from public.vpn_payment_orders
  where vpn_payment_orders.id = p_order_id
  for update;

  if not found or v_order.license_id <> p_license_id or v_order.status not in ('paid', 'licensed') then
    raise exception 'payment order cannot be licensed' using errcode = 'P0002';
  end if;

  update public.vpn_payment_orders
  set status = 'licensed',
      license_key = coalesce(license_key, p_license_key),
      licensed_at = coalesce(licensed_at, now())
  where vpn_payment_orders.id = p_order_id
  returning * into v_order;

  return query select v_order.id, v_order.status, v_order.license_id, v_order.license_key, v_order.license_expires_at;
end;
$$;

revoke all on table public.vpn_payment_orders from public, anon, authenticated;
revoke all on table public.vpn_machine_trial_ledger from public, anon, authenticated;
revoke all on function public.claim_vpn_payment_order(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_vpn_payment_license(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_vpn_payment_order(uuid, text, uuid) to service_role;
grant execute on function public.complete_vpn_payment_license(uuid, uuid, text) to service_role;
