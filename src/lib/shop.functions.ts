import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { SEED_PRODUCTS } from "@/lib/catalog-seed";

export type PublicProduct = {
  id: string;
  name: string;
  summary: string;
  description: string;
  priceCents: number;
  category: string;
  image: string;
  imageBack: string;
  imageLeft: string;
  imageRight: string;
  stripeLink: string;
  featured: boolean;
  featureOrder: number;
  listOrder: number;
  sold: boolean;
  listedAt: string;
};

export type DeskProduct = PublicProduct & { costCents: number; soldAt: string | null };

export type Offer = {
  id: string;
  code: string;
  label: string;
  percent: number;
  active: boolean;
};

export type Settings = {
  shopName: string;
  weekNote: string;
  contactEmail: string;
  stripeUrl: string;
  stripeReady: boolean;
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  amountCents: number;
  costCents: number;
  offerCode: string;
  channel: string;
  soldAt: string;
};

export type ShopPayload = {
  settings: Settings;
  offers: Offer[];
  products: PublicProduct[];
};

export type ShopOrder = {
  id: string;
  productId: string;
  productName: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  amountCents: number;
  status: string;
  createdAt: string;
};

export type DeskPayload = {
  locked: false;
  settings: Settings;
  offers: Offer[];
  products: DeskProduct[];
  sales: Sale[];
  orders: ShopOrder[];
  revenueCents: number;
  profitCents: number;
};

export type DeskResult = { locked: true } | DeskPayload;

type ProductRow = {
  id: string;
  name: string;
  summary: string;
  description: string;
  price_cents: number;
  cost_cents: number;
  category: string;
  image: string;
  image_back: string;
  image_left: string;
  image_right: string;
  stripe_product_id: string;
  stripe_price_id: string;
  stripe_link_id: string;
  stripe_link: string;
  stripe_amount: number;
  featured: boolean | number;
  feature_order: number;
  list_order: number;
  sold: boolean | number;
  listed_at: string;
  sold_at: string | null;
};

const PRODUCT_SQL = `select id, name, summary, description, price_cents, cost_cents, category, image,
  image_back, image_left, image_right,
  stripe_product_id, stripe_price_id, stripe_link_id, stripe_link, stripe_amount,
  featured, feature_order, list_order, sold, listed_at, sold_at
  from products order by list_order, name`;

const requireDesk = createServerOnlyFn(async () => {
  const { assertDesk } = await import("@/lib/desk-lock.server");
  await assertDesk();
});

function pub(row: ProductRow): PublicProduct {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    description: row.description,
    priceCents: Number(row.price_cents),
    category: row.category,
    image: row.image,
    imageBack: row.image_back ?? "",
    imageLeft: row.image_left ?? "",
    imageRight: row.image_right ?? "",
    stripeLink: row.stripe_link ?? "",
    featured: sqlBoolean(row.featured),
    featureOrder: Number(row.feature_order),
    listOrder: Number(row.list_order),
    sold: sqlBoolean(row.sold),
    listedAt: String(row.listed_at),
  };
}

function deskProduct(row: ProductRow): DeskProduct {
  return { ...pub(row), costCents: Number(row.cost_cents), soldAt: row.sold_at ? String(row.sold_at) : null };
}

function sqlBoolean(value: boolean | number): boolean {
  return value === true || value === 1;
}

async function ensure() {
  const sql = await getSql();
  await sql`
    insert into shop_settings (id, shop_name, week_note, contact_email, stripe_url)
    values (
      'main',
      'What the Craft Gifts',
      'This week: all new handmade stuffed animals.',
      '',
      'https://dashboard.stripe.com/'
    )
    on conflict (id) do nothing
  `;
  const count = await sql<{ n: number }>`select count(*) as n from products`;
  if (Number(count[0]?.n ?? 0) > 0) return;
  for (const item of SEED_PRODUCTS) {
    await sql`
      insert into products (
        id, name, summary, description, price_cents, category, image, featured, feature_order, list_order
      ) values (
        ${item.id}, ${item.name}, ${item.summary}, ${item.description}, ${item.priceCents},
        ${item.category}, ${item.image}, ${item.featured}, ${item.featureOrder}, ${item.listOrder}
      )
      on conflict (id) do nothing
    `;
  }
  await sql`
    insert into offers (id, code, label, percent, active)
    values ('show10', 'SHOW10', 'Show week, 10% off', 10, true)
    on conflict (id) do nothing
  `;
}

async function readSettings(): Promise<Settings> {
  const sql = await getSql();
  const rows = await sql<{
    shop_name: string;
    week_note: string;
    contact_email: string;
    stripe_url: string;
    stripe_ready: boolean | number;
  }>`select shop_name, week_note, contact_email, stripe_url,
            (coalesce(stripe_key, '') <> '') as stripe_ready
     from shop_settings where id = 'main'`;
  const row = rows[0];
  return {
    shopName: row?.shop_name ?? "What the Craft Gifts",
    weekNote: row?.week_note ?? "",
    contactEmail: row?.contact_email ?? "",
    stripeUrl: row?.stripe_url || "https://dashboard.stripe.com/",
    stripeReady: sqlBoolean(row?.stripe_ready ?? false) || Boolean(process.env.STRIPE_SECRET_KEY),
  };
}

async function readOffers(): Promise<Offer[]> {
  const sql = await getSql();
  const rows = await sql<{ id: string; code: string; label: string; percent: number; active: boolean | number }>`
    select id, code, label, percent, active from offers order by code
  `;
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    percent: Number(row.percent),
    active: sqlBoolean(row.active),
  }));
}

export const fetchShop = createServerFn({ method: "GET" }).handler(async (): Promise<ShopPayload> => {
  await ensure();
  const sql = await getSql();
  const rows = await sql.query<ProductRow>(PRODUCT_SQL);
  return {
    settings: await readSettings(),
    offers: await readOffers(),
    products: rows.map(pub),
  };
});

export const fetchDesk = createServerFn({ method: "GET" }).handler(async (): Promise<DeskResult> => {
  await ensure();
  const { deskOpen } = await import("@/lib/desk-lock.server");
  if (!(await deskOpen())) return { locked: true };
  const sql = await getSql();
  const rows = await sql.query<ProductRow>(PRODUCT_SQL);
  const sales = await sql.query<Sale>(
    `select id, product_id as "productId", product_name as "productName", qty,
            amount_cents as "amountCents", cost_cents as "costCents", offer_code as "offerCode",
            channel, sold_at as "soldAt"
     from sales order by sold_at desc limit 200`,
  );
  const totals = await sql<{ revenue: number; profit: number }>`
    select coalesce(sum(amount_cents), 0) as revenue,
           coalesce(sum(amount_cents - cost_cents), 0) as profit
    from sales
  `;
  const orders = await sql.query<ShopOrder>(
    `select id, product_id as "productId", product_name as "productName",
            buyer_name as "buyerName", buyer_email as "buyerEmail", buyer_phone as "buyerPhone",
            amount_cents as "amountCents", status, created_at as "createdAt"
     from orders order by created_at desc limit 100`,
  );
  return {
    locked: false,
    settings: await readSettings(),
    offers: await readOffers(),
    products: rows.map(deskProduct),
    sales: sales.map((sale) => ({
      ...sale,
      qty: Number(sale.qty),
      amountCents: Number(sale.amountCents),
      costCents: Number(sale.costCents),
    })),
    orders: orders.map((order) => ({ ...order, amountCents: Number(order.amountCents) })),
    revenueCents: Number(totals[0]?.revenue ?? 0),
    profitCents: Number(totals[0]?.profit ?? 0),
  };
});

type ProductInput = {
  id: string;
  name: string;
  summary: string;
  description: string;
  priceCents: number;
  costCents: number;
  category: string;
  image: string;
  imageBack: string;
  imageLeft: string;
  imageRight: string;
  featured: boolean;
  featureOrder: number;
  listOrder: number;
  origin: string;
};

function photo(value: unknown) {
  const image = typeof value === "string" ? value : "";
  if (image.length > 1_800_000) throw new Error("That photo is too large. Use a smaller one.");
  return image;
}

function parseProduct(data: unknown): ProductInput {
  const d = (data ?? {}) as Record<string, unknown>;
  const name = typeof d.name === "string" ? d.name.trim() : "";
  if (!name) throw new Error("Add a name.");
  const priceCents = Number(d.priceCents);
  if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error("Add a price.");
  const image = photo(d.image);
  const imageBack = photo(d.imageBack);
  const imageLeft = photo(d.imageLeft);
  const imageRight = photo(d.imageRight);
  return {
    id: typeof d.id === "string" ? d.id : "",
    name: name.slice(0, 80),
    summary: String(d.summary ?? "").slice(0, 180),
    description: String(d.description ?? "").slice(0, 2000),
    priceCents: Math.round(priceCents),
    costCents: Math.max(0, Math.round(Number(d.costCents) || 0)),
    category: String(d.category || "Animals").slice(0, 40),
    image,
    imageBack,
    imageLeft,
    imageRight,
    featured: Boolean(d.featured),
    featureOrder: Math.round(Number(d.featureOrder) || 0),
    listOrder: Math.round(Number(d.listOrder) || 0),
    origin: safeOrigin(d.origin),
  };
}

function safeOrigin(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    if (url.username || url.password) return "";
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

async function listOnStripe(id: string, origin: string) {
  const { stripeConnected, pushListing } = await import("@/lib/stripe.server");
  if (!(await stripeConnected())) return "";
  const sql = await getSql();
  const rows = await sql<ProductRow>`
    select id, name, summary, description, price_cents, cost_cents, category, image,
           image_back, image_left, image_right,
           stripe_product_id, stripe_price_id, stripe_link_id, stripe_link, stripe_amount,
           featured, feature_order, list_order, sold, listed_at, sold_at
    from products where id = ${id}
  `;
  const row = rows[0];
  if (!row || row.sold) return "";
  const listed = await pushListing({
    id: row.id,
    name: row.name,
    priceCents: Number(row.price_cents),
    productId: row.stripe_product_id || "",
    priceId: row.stripe_price_id || "",
    linkId: row.stripe_link_id || "",
    amount: Number(row.stripe_amount) || 0,
    origin,
  });
  await sql`
    update products set
      stripe_product_id = ${listed.productId},
      stripe_price_id = ${listed.priceId},
      stripe_link_id = ${listed.linkId},
      stripe_link = ${listed.link},
      stripe_amount = ${listed.amount}
    where id = ${id}
  `;
  return listed.link;
}

async function closeStripeLink(id: string) {
  const sql = await getSql();
  const rows = await sql<{ stripe_link_id: string }>`select stripe_link_id from products where id = ${id}`;
  const linkId = rows[0]?.stripe_link_id || "";
  if (!linkId) return;
  const { closeListing } = await import("@/lib/stripe.server");
  await closeListing(linkId);
}

async function syncAll(origin: string) {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string }>`select id, name from products where sold = 0 order by list_order, name`;
  let synced = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      await listOnStripe(row.id, origin);
      synced += 1;
    } catch (err) {
      errors.push(`${row.name}: ${err instanceof Error ? err.message : "Stripe didn't take it."}`);
    }
  }
  return { synced, errors: errors.slice(0, 3) };
}

export const saveProduct = createServerFn({ method: "POST" })
  .validator(parseProduct)
  .handler(async ({ data }) => {
    await requireDesk();
    await ensure();
    const sql = await getSql();
    const id = data.id || crypto.randomUUID();
    await sql`
      insert into products (
        id, name, summary, description, price_cents, cost_cents, category, image,
        image_back, image_left, image_right,
        featured, feature_order, list_order
      ) values (
        ${id}, ${data.name}, ${data.summary}, ${data.description}, ${data.priceCents}, ${data.costCents},
        ${data.category}, ${data.image}, ${data.imageBack}, ${data.imageLeft}, ${data.imageRight},
        ${data.featured}, ${data.featureOrder}, ${data.listOrder}
      )
      on conflict (id) do update set
        name = excluded.name,
        summary = excluded.summary,
        description = excluded.description,
        price_cents = excluded.price_cents,
        cost_cents = excluded.cost_cents,
        category = excluded.category,
        image = excluded.image,
        image_back = excluded.image_back,
        image_left = excluded.image_left,
        image_right = excluded.image_right,
        featured = excluded.featured,
        feature_order = excluded.feature_order,
        list_order = excluded.list_order
    `;
    let stripeNote = "";
    try {
      const link = await listOnStripe(id, data.origin);
      if (link) stripeNote = "On Stripe too.";
    } catch (err) {
      stripeNote = err instanceof Error ? `Saved here. Stripe said: ${err.message}` : "Saved here. Stripe didn't take it.";
    }
    return { id, stripeNote };
  });

export const removeProduct = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const id = (data as { id?: string })?.id;
    if (!id) throw new Error("Missing item.");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    await closeStripeLink(data.id);
    const sql = await getSql();
    await sql`delete from products where id = ${data.id}`;
    return { ok: true };
  });

export const saveSettings = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    const stripeUrl = String(d.stripeUrl ?? "https://dashboard.stripe.com/").slice(0, 300);
    if (!/^https:\/\//.test(stripeUrl)) throw new Error("Stripe link must start with https://");
    return {
      shopName: String(d.shopName ?? "What the Craft Gifts").slice(0, 80),
      weekNote: String(d.weekNote ?? "").slice(0, 240),
      contactEmail: String(d.contactEmail ?? "").slice(0, 120),
      stripeUrl,
    };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    await ensure();
    const sql = await getSql();
    await sql`
      update shop_settings set
        shop_name = ${data.shopName},
        week_note = ${data.weekNote},
        contact_email = ${data.contactEmail},
        stripe_url = ${data.stripeUrl}
      where id = 'main'
    `;
    return { ok: true };
  });

export const saveOffer = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    const code = String(d.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (code.length < 2) throw new Error("Add a code, like SHOW10.");
    const percent = Math.round(Number(d.percent));
    if (!Number.isFinite(percent) || percent < 1 || percent > 90) throw new Error("Percent should be 1 to 90.");
    return {
      id: typeof d.id === "string" && d.id ? d.id : "",
      code: code.slice(0, 24),
      label: String(d.label ?? "").slice(0, 80),
      percent,
      active: d.active !== false,
    };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    await ensure();
    const sql = await getSql();
    const id = data.id || crypto.randomUUID();
    await sql`
      insert into offers (id, code, label, percent, active)
      values (${id}, ${data.code}, ${data.label}, ${data.percent}, ${data.active})
      on conflict (id) do update set
        code = excluded.code,
        label = excluded.label,
        percent = excluded.percent,
        active = excluded.active
    `;
    try {
      const { pushOffers } = await import("@/lib/stripe.server");
      await pushOffers(await readOffers());
    } catch {
      // The shop code is saved even if Stripe already has it.
    }
    return { id };
  });

type CheckoutInput = { productId: string; offerCode: string; channel: "online" | "show" };

function parseCheckout(data: unknown): CheckoutInput {
  const d = (data ?? {}) as Record<string, unknown>;
  if (typeof d.productId !== "string" || !d.productId) throw new Error("Missing item.");
  return {
    productId: d.productId,
    offerCode: String(d.offerCode ?? "").trim().slice(0, 24),
    channel: d.channel === "show" ? "show" : "online",
  };
}

export const checkout = createServerFn({ method: "POST" })
  .validator(parseCheckout)
  .handler(async ({ data }) => {
    if (data.channel === "show") await requireDesk();
    await ensure();
    const sql = await getSql();
    const found = await sql<ProductRow>`
      select id, name, summary, description, price_cents, cost_cents, category, image,
             featured, feature_order, list_order, sold, listed_at, sold_at
      from products where id = ${data.productId}
    `;
    const product = found[0];
    if (!product || product.sold) return { ok: false as const, error: "That one just sold." };
    let percent = 0;
    let offerCode = "";
    if (data.offerCode) {
      const offers = await sql<{ code: string; percent: number }>`
        select code, percent from offers
        where upper(code) = ${data.offerCode.toUpperCase()} and active = 1
      `;
      if (!offers[0]) return { ok: false as const, error: "That code isn't active." };
      percent = Number(offers[0].percent);
      offerCode = offers[0].code;
    }
    const amount = Math.round((Number(product.price_cents) * (100 - percent)) / 100);
    const taken = await sql<{ id: string }>`
      update products set sold = 1, sold_at = datetime('now')
      where id = ${product.id} and sold = 0
      returning id
    `;
    if (!taken[0]) return { ok: false as const, error: "That one just sold." };
    await closeStripeLink(product.id);
    const settings = await readSettings();
    await sql`
      insert into sales (id, product_id, product_name, qty, amount_cents, cost_cents, offer_code, channel)
      values (
        ${crypto.randomUUID()}, ${product.id}, ${product.name}, 1, ${amount},
        ${Number(product.cost_cents)}, ${offerCode}, ${data.channel}
      )
    `;
    return {
      ok: true as const,
      name: product.name,
      amountCents: amount,
      offerCode,
      contactEmail: settings.contactEmail,
    };
  });

export const putBack = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const id = (data as { id?: string })?.id;
    if (!id) throw new Error("Missing item.");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    const sql = await getSql();
    await sql`update products set sold = 0, sold_at = null where id = ${data.id}`;
    try {
      await listOnStripe(data.id, "");
    } catch {
      // The piece is back on the shelf even if Stripe is quiet.
    }
    await sql`
      delete from sales where id = (
        select id from sales where product_id = ${data.id} order by sold_at desc limit 1
      )
    `;
    return { ok: true };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    const productId = String(d.productId ?? "");
    const buyerName = String(d.buyerName ?? "").trim().slice(0, 80);
    const buyerEmail = String(d.buyerEmail ?? "").trim().slice(0, 120);
    const buyerPhone = String(d.buyerPhone ?? "").trim().slice(0, 40);
    if (!productId) throw new Error("Missing item.");
    if (buyerName.length < 2) throw new Error("Add your name.");
    if (!buyerEmail.includes("@") || !buyerEmail.includes(".")) throw new Error("Add an email Mona can reply to.");
    return { productId, buyerName, buyerEmail, buyerPhone };
  })
  .handler(async ({ data }) => {
    await ensure();
    const sql = await getSql();
    const found = await sql<{ id: string; name: string; price_cents: number; sold: boolean | number }>`
      select id, name, price_cents, sold from products where id = ${data.productId}
    `;
    const product = found[0];
    if (!product || product.sold) return { ok: false as const, error: "That one just sold." };
    await sql`
      insert into orders (id, product_id, product_name, buyer_name, buyer_email, buyer_phone, amount_cents, status)
      values (
        ${crypto.randomUUID()}, ${product.id}, ${product.name}, ${data.buyerName}, ${data.buyerEmail},
        ${data.buyerPhone}, ${Number(product.price_cents)}, 'requested'
      )
    `;
    return { ok: true as const, name: product.name, amountCents: Number(product.price_cents) };
  });

export const markOrderPaid = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const id = String((data as { id?: string })?.id ?? "");
    if (!id) throw new Error("Missing order.");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    const sql = await getSql();
    const rows = await sql<{ id: string; product_id: string; product_name: string; amount_cents: number; status: string }>`
      select id, product_id, product_name, amount_cents, status from orders where id = ${data.id}
    `;
    const order = rows[0];
    if (!order) throw new Error("That order is gone.");
    if (order.status === "paid") return { ok: true };
    await sql`update orders set status = 'paid' where id = ${order.id}`;
    await sql`update products set sold = 1, sold_at = datetime('now') where id = ${order.product_id} and sold = 0`;
    await sql`
      insert into sales (id, product_id, product_name, qty, amount_cents, cost_cents, offer_code, channel)
      values (${crypto.randomUUID()}, ${order.product_id}, ${order.product_name}, 1, ${Number(order.amount_cents)}, 0, '', 'online')
    `;
    try {
      await closeStripeLink(order.product_id);
    } catch {
      // The piece is marked sold even if Stripe is quiet.
    }
    return { ok: true };
  });

export const releaseOrder = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const id = String((data as { id?: string })?.id ?? "");
    if (!id) throw new Error("Missing order.");
    return { id };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    const sql = await getSql();
    await sql`delete from orders where id = ${data.id} and status = 'requested'`;
    return { ok: true };
  });

export const unlockDesk = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const password = String((data as { password?: string })?.password ?? "");
    if (password.length < 4 || password.length > 80) throw new Error("Enter the desk code.");
    return { password };
  })
  .handler(async ({ data }) => {
    const { openDesk } = await import("@/lib/desk-lock.server");
    return { ok: await openDesk(data.password) };
  });

export const lockDesk = createServerFn({ method: "POST" })
  .validator(() => ({}))
  .handler(async () => {
    const { closeDesk } = await import("@/lib/desk-lock.server");
    await closeDesk();
    return { ok: true };
  });

export const changeDeskCode = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const next = String((data as { next?: string })?.next ?? "");
    return { next };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    const { changeDeskPassword } = await import("@/lib/desk-lock.server");
    await changeDeskPassword(data.next);
    return { ok: true };
  });

export const connectStripe = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = (data ?? {}) as { key?: string; origin?: string };
    return { key: String(d.key ?? ""), origin: safeOrigin(d.origin) };
  })
  .handler(async ({ data }) => {
    await requireDesk();
    await ensure();
    const { saveStripeKey, pushOffers } = await import("@/lib/stripe.server");
    await saveStripeKey(data.key);
    await pushOffers(await readOffers());
    return syncAll(data.origin);
  });

export const syncStripe = createServerFn({ method: "POST" })
  .validator((data: unknown) => ({ origin: safeOrigin((data as { origin?: string })?.origin) }))
  .handler(async ({ data }) => {
    await requireDesk();
    await ensure();
    const { stripeConnected, pushOffers } = await import("@/lib/stripe.server");
    if (!(await stripeConnected())) throw new Error("Connect Stripe first.");
    await pushOffers(await readOffers());
    return syncAll(data.origin);
  });

export const confirmPaid = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const sessionId = String((data as { sessionId?: string })?.sessionId ?? "");
    if (!sessionId) throw new Error("Missing payment.");
    return { sessionId };
  })
  .handler(async ({ data }) => {
    const { paidPiece, closeListing } = await import("@/lib/stripe.server");
    const paid = await paidPiece(data.sessionId);
    if (!paid.pieceId && !paid.linkId) return { ok: false as const };
    const sql = await getSql();
    const found = paid.pieceId
      ? await sql<{ id: string; name: string; price_cents: number; cost_cents: number; stripe_link_id: string; sold: boolean | number }>`
          select id, name, price_cents, cost_cents, stripe_link_id, sold from products where id = ${paid.pieceId} limit 1
        `
      : await sql<{ id: string; name: string; price_cents: number; cost_cents: number; stripe_link_id: string; sold: boolean | number }>`
          select id, name, price_cents, cost_cents, stripe_link_id, sold from products where stripe_link_id = ${paid.linkId} limit 1
        `;
    const product = found[0];
    if (!product) return { ok: false as const };
    const taken = await sql<{ id: string }>`
      update products set sold = 1, sold_at = datetime('now')
      where id = ${product.id} and sold = 0
      returning id
    `;
    if (taken[0]) {
      await sql`
        insert into sales (id, product_id, product_name, qty, amount_cents, cost_cents, offer_code, channel)
        values (
          ${crypto.randomUUID()}, ${product.id}, ${product.name}, 1,
          ${Number(product.price_cents)}, ${Number(product.cost_cents)}, '', 'stripe'
        )
      `;
    }
    if (product.stripe_link_id) await closeListing(product.stripe_link_id);
    return { ok: true as const };
  });


