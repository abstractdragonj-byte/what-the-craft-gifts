create table if not exists products (
  id text primary key,
  name text not null,
  summary text not null default '',
  description text not null default '',
  price_cents integer not null,
  cost_cents integer not null default 0,
  category text not null default 'Animals',
  image text not null default '',
  featured boolean not null default false,
  feature_order integer not null default 0,
  list_order integer not null default 0,
  sold boolean not null default false,
  listed_at timestamptz not null default now(),
  sold_at timestamptz
);

create table if not exists offers (
  id text primary key,
  code text not null,
  label text not null,
  percent integer not null default 0,
  active boolean not null default true
);

create table if not exists sales (
  id text primary key,
  product_id text not null,
  product_name text not null,
  qty integer not null default 1,
  amount_cents integer not null,
  cost_cents integer not null default 0,
  offer_code text not null default '',
  channel text not null default 'online',
  sold_at timestamptz not null default now()
);

create table if not exists shop_settings (
  id text primary key,
  shop_name text not null,
  week_note text not null,
  contact_email text not null default '',
  stripe_url text not null default 'https://dashboard.stripe.com/'
);
