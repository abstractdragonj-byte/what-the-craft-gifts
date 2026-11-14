alter table products add column if not exists stripe_product_id text not null default '';
alter table products add column if not exists stripe_price_id text not null default '';
alter table products add column if not exists stripe_link_id text not null default '';
alter table products add column if not exists stripe_link text not null default '';
alter table products add column if not exists stripe_amount integer not null default 0;
alter table shop_settings add column if not exists stripe_key text not null default '';
alter table shop_settings add column if not exists stripe_logo_file text not null default '';
