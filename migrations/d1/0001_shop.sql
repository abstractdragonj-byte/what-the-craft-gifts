CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Animals',
  image TEXT NOT NULL DEFAULT '',
  image_back TEXT NOT NULL DEFAULT '',
  image_left TEXT NOT NULL DEFAULT '',
  image_right TEXT NOT NULL DEFAULT '',
  stripe_product_id TEXT NOT NULL DEFAULT '',
  stripe_price_id TEXT NOT NULL DEFAULT '',
  stripe_link_id TEXT NOT NULL DEFAULT '',
  stripe_link TEXT NOT NULL DEFAULT '',
  stripe_amount INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  feature_order INTEGER NOT NULL DEFAULT 0,
  list_order INTEGER NOT NULL DEFAULT 0,
  sold INTEGER NOT NULL DEFAULT 0,
  listed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sold_at TEXT
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  percent INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  amount_cents INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  offer_code TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'online',
  sold_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_settings (
  id TEXT PRIMARY KEY,
  shop_name TEXT NOT NULL,
  week_note TEXT NOT NULL,
  contact_email TEXT NOT NULL DEFAULT '',
  stripe_url TEXT NOT NULL DEFAULT 'https://dashboard.stripe.com/',
  desk_hash TEXT NOT NULL DEFAULT '',
  stripe_key TEXT NOT NULL DEFAULT '',
  stripe_logo_file TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
