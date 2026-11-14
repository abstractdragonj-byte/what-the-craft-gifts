create table if not exists orders (
  id text primary key,
  product_id text not null,
  product_name text not null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null default '',
  amount_cents integer not null,
  status text not null default 'requested',
  created_at timestamptz not null default now()
);
