-- PostgreSQL schema for focus products and targets distribution
-- Date: 2026-04-20

-- =========================
-- Product and Focus Campaigns
-- =========================

create table if not exists products (
  id bigserial primary key,
  sku text not null unique,
  name text not null,
  category_name text,
  cluster_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists focus_campaigns (
  id bigserial primary key,
  campaign_name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_by text,
  created_at timestamptz not null default now(),
  constraint chk_focus_campaign_dates check (end_date >= start_date)
);

create table if not exists focus_campaign_products (
  id bigserial primary key,
  campaign_id bigint not null references focus_campaigns(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  seller_bonus_uah numeric(12,2) not null default 0,
  company_bonus_uah numeric(12,2) not null default 0,
  unique (campaign_id, product_id)
);

create index if not exists idx_focus_campaign_period
  on focus_campaigns (status, start_date, end_date);

create index if not exists idx_focus_campaign_products_product
  on focus_campaign_products (product_id);

create or replace view vw_active_focus_products as
select
  p.id as product_id,
  p.sku,
  p.name,
  fc.id as campaign_id,
  fc.campaign_name,
  fcp.seller_bonus_uah,
  fcp.company_bonus_uah
from focus_campaigns fc
join focus_campaign_products fcp on fcp.campaign_id = fc.id
join products p on p.id = fcp.product_id
where fc.status = 'active'
  and current_date between fc.start_date and fc.end_date
  and p.is_active = true;


-- =========================
-- Target Profiles (weights)
-- =========================

create table if not exists target_profiles (
  id bigserial primary key,
  profile_name text not null unique,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists target_profile_month_weights (
  id bigserial primary key,
  profile_id bigint not null references target_profiles(id) on delete cascade,
  month_no int not null check (month_no between 1 and 12),
  weight_percent numeric(8,4) not null check (weight_percent >= 0),
  unique (profile_id, month_no)
);

create table if not exists target_profile_week_weights (
  id bigserial primary key,
  profile_id bigint not null references target_profiles(id) on delete cascade,
  week_no int not null check (week_no between 1 and 5),
  weight_percent numeric(8,4) not null check (weight_percent >= 0),
  unique (profile_id, week_no)
);


-- =========================
-- Regions / Stores / Promoters
-- =========================

create table if not exists regions (
  id bigserial primary key,
  region_code text not null unique,
  region_name text not null,
  weight_coeff numeric(8,4) not null default 1 check (weight_coeff >= 0)
);

create table if not exists stores (
  id bigserial primary key,
  region_id bigint not null references regions(id) on delete restrict,
  store_code text not null unique,
  store_name text not null,
  weight_coeff numeric(8,4) not null default 1 check (weight_coeff >= 0),
  has_promoter boolean not null default false,
  promoter_coeff numeric(8,4) not null default 1 check (promoter_coeff >= 0),
  is_active boolean not null default true
);

create index if not exists idx_stores_region on stores(region_id);


-- =========================
-- Target cycles and generated plans
-- =========================

create table if not exists target_cycles (
  id bigserial primary key,
  cycle_name text not null,
  profile_id bigint not null references target_profiles(id) on delete restrict,
  total_goal numeric(14,2) not null check (total_goal >= 0),
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by text,
  created_at timestamptz not null default now(),
  constraint chk_target_cycle_dates check (end_date >= start_date)
);

create table if not exists target_cycle_store_plans (
  id bigserial primary key,
  target_cycle_id bigint not null references target_cycles(id) on delete cascade,
  month_no int not null check (month_no between 1 and 12),
  week_no int not null check (week_no between 1 and 5),
  store_id bigint not null references stores(id) on delete restrict,
  goal_value numeric(14,2) not null check (goal_value >= 0),
  is_manual_override boolean not null default false,
  unique (target_cycle_id, month_no, week_no, store_id)
);

create index if not exists idx_target_cycle_store_plans_cycle
  on target_cycle_store_plans(target_cycle_id);


-- =========================
-- Helper query: auto-distribution by weights and coefficients
-- Input: :target_cycle_id
-- =========================

/*
with cycle as (
  select tc.id, tc.total_goal, tc.profile_id
  from target_cycles tc
  where tc.id = :target_cycle_id
),
month_weights as (
  select mw.month_no,
         mw.weight_percent / nullif(sum(mw.weight_percent) over (), 0) as month_share
  from target_profile_month_weights mw
  join cycle c on c.profile_id = mw.profile_id
),
week_weights as (
  select ww.week_no,
         ww.weight_percent / nullif(sum(ww.weight_percent) over (), 0) as week_share
  from target_profile_week_weights ww
  join cycle c on c.profile_id = ww.profile_id
),
store_scores as (
  select
    s.id as store_id,
    r.region_name,
    s.store_name,
    (r.weight_coeff * s.weight_coeff * case when s.has_promoter then s.promoter_coeff else 1 end) as score
  from stores s
  join regions r on r.id = s.region_id
  where s.is_active = true
),
store_share as (
  select
    ss.*,
    ss.score / nullif(sum(ss.score) over (), 0) as share
  from store_scores ss
)
select
  c.id as target_cycle_id,
  mw.month_no,
  ww.week_no,
  ss.store_id,
  round((c.total_goal * mw.month_share * ww.week_share * ss.share)::numeric, 2) as goal_value
from cycle c
cross join month_weights mw
cross join week_weights ww
cross join store_share ss
order by mw.month_no, ww.week_no, ss.region_name, ss.store_name;
*/

