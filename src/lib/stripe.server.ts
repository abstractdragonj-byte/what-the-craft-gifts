import { getSql } from "@/lib/db";

const LOGO =
  "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";

export type ListingInput = {
  id: string;
  name: string;
  priceCents: number;
  productId: string;
  priceId: string;
  linkId: string;
  amount: number;
  origin: string;
};

export type ListingResult = {
  productId: string;
  priceId: string;
  linkId: string;
  link: string;
  amount: number;
};

async function getKey() {
  const fromEnv = process.env.STRIPE_SECRET_KEY?.trim();
  if (fromEnv) return fromEnv;
  const sql = await getSql();
  const rows = await sql<{ stripe_key: string }>`select stripe_key from shop_settings where id = 'main'`;
  return rows[0]?.stripe_key?.trim() || "";
}

export async function stripeConnected() {
  return Boolean(await getKey());
}

async function stripe(path: string, body?: Record<string, string>, method = "POST") {
  const key = await getKey();
  if (!key) throw new Error("Stripe isn't connected.");
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? new URLSearchParams(body) : undefined,
  });
  const json = (await res.json()) as { error?: { message?: string } } & Record<string, unknown>;
  if (!res.ok) throw new Error(json.error?.message || "Stripe didn't accept that.");
  return json;
}

export async function saveStripeKey(key: string) {
  const trimmed = key.trim();
  if (!/^(sk|rk)_(test|live)_/.test(trimmed)) {
    throw new Error("Paste the secret key from Stripe. It starts with sk_live_ or rk_live_.");
  }
  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${trimmed}` },
  });
  if (!res.ok) throw new Error("Stripe didn't accept that key. Check that you copied the whole secret key.");
  const sql = await getSql();
  await sql`update shop_settings set stripe_key = ${trimmed} where id = 'main'`;
  await installLogo();
}

async function installLogo() {
  const sql = await getSql();
  const rows = await sql<{ stripe_logo_file: string }>`select stripe_logo_file from shop_settings where id = 'main'`;
  if (rows[0]?.stripe_logo_file) return;
  const key = await getKey();
  const form = new FormData();
  form.set("purpose", "business_logo");
  form.set("file", new Blob([Buffer.from(LOGO, "base64")], { type: "image/png" }), "what-the-craft.png");
  const res = await fetch("https://files.stripe.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const json = (await res.json()) as { id?: string };
  if (!res.ok || !json.id) return;
  await sql`update shop_settings set stripe_logo_file = ${json.id} where id = 'main'`;
  try {
    await stripe("/account", {
      "settings[branding][logo]": json.id,
      "settings[branding][icon]": json.id,
      "settings[branding][primary_color]": "#1e7a46",
      "settings[branding][secondary_color]": "#f3efe8",
    });
  } catch {
    // Some accounts only allow the logo from the Stripe dashboard. Listings still go through.
  }
}

function logoUrl(origin: string) {
  return origin.startsWith("https://") ? `${origin}/logo.png` : "";
}

export async function pushListing(input: ListingInput): Promise<ListingResult> {
  if (input.priceCents < 50) throw new Error("Stripe needs a price of at least $0.50.");
  let productId = input.productId;
  const image = logoUrl(input.origin);
  if (productId) {
    const fields: Record<string, string> = { name: input.name };
    if (image) fields["images[0]"] = image;
    try {
      await stripe(`/products/${productId}`, fields);
    } catch {
      await stripe(`/products/${productId}`, { name: input.name });
    }
  } else {
    const fields: Record<string, string> = {
      name: input.name,
      "metadata[piece_id]": input.id,
    };
    if (image) fields["images[0]"] = image;
    let created: Record<string, unknown>;
    try {
      created = await stripe("/products", fields);
    } catch {
      created = await stripe("/products", { name: input.name, "metadata[piece_id]": input.id });
    }
    productId = String(created.id);
  }

  let priceId = input.priceId;
  if (!priceId || input.amount !== input.priceCents) {
    const price = await stripe("/prices", {
      currency: "usd",
      unit_amount: String(input.priceCents),
      product: productId,
    });
    if (input.priceId) {
      try {
        await stripe(`/prices/${input.priceId}`, { active: "false" });
      } catch {
        // The old price can stay archived by hand if Stripe refuses.
      }
    }
    priceId = String(price.id);
  }

  let linkId = input.linkId;
  let link = "";
  if (!linkId || input.amount !== input.priceCents) {
    if (input.linkId) {
      try {
        await stripe(`/payment_links/${input.linkId}`, { active: "false" });
      } catch {
        // Closing the old link is best-effort.
      }
    }
    const body: Record<string, string> = {
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "metadata[piece_id]": input.id,
      "restrictions[completed_sessions][limit]": "1",
      allow_promotion_codes: "true",
      billing_address_collection: "auto",
      "shipping_address_collection[allowed_countries][0]": "US",
      "shipping_address_collection[allowed_countries][1]": "CA",
    };
    if (input.origin) {
      body["after_completion[type]"] = "redirect";
      body["after_completion[redirect][url]"] = `${input.origin}/?paid={CHECKOUT_SESSION_ID}`;
    }
    let payment: Record<string, unknown>;
    try {
      payment = await stripe("/payment_links", body);
    } catch {
      delete body["shipping_address_collection[allowed_countries][0]"];
      delete body["shipping_address_collection[allowed_countries][1]"];
      delete body["restrictions[completed_sessions][limit]"];
      payment = await stripe("/payment_links", body);
    }
    linkId = String(payment.id);
    link = String(payment.url);
  } else {
    const existing = await stripe(`/payment_links/${linkId}`, undefined, "GET");
    link = String(existing.url || "");
  }

  return { productId, priceId, linkId, link, amount: input.priceCents };
}

export async function closeListing(linkId: string) {
  if (!linkId || !(await getKey())) return;
  try {
    await stripe(`/payment_links/${linkId}`, { active: "false" });
  } catch {
    // Already closed.
  }
}

export async function pushOffers(offers: { code: string; percent: number; label: string; active: boolean }[]) {
  if (!(await getKey())) return;
  for (const offer of offers) {
    if (!offer.active) continue;
    try {
      await stripe("/coupons", {
        id: offer.code,
        percent_off: String(offer.percent),
        duration: "forever",
        name: offer.label || offer.code,
      });
    } catch {
      // The code is already on Stripe.
    }
  }
}

export async function paidPiece(sessionId: string) {
  if (!/^cs_(test|live)_/.test(sessionId)) throw new Error("That payment receipt isn't valid.");
  const session = await stripe(`/checkout/sessions/${sessionId}`, undefined, "GET");
  if (session.payment_status !== "paid") return { pieceId: "", linkId: "" };
  const meta = session.metadata as { piece_id?: string } | null;
  const linkId = typeof session.payment_link === "string" ? session.payment_link : "";
  if (meta?.piece_id) return { pieceId: meta.piece_id, linkId };
  if (!linkId) return { pieceId: "", linkId: "" };
  const link = await stripe(`/payment_links/${linkId}`, undefined, "GET");
  const linkMeta = link.metadata as { piece_id?: string } | null;
  return { pieceId: linkMeta?.piece_id || "", linkId };
}
