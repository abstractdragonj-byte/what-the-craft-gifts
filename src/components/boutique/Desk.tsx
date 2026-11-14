import { useEffect, useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { DeskPayload, DeskProduct } from "@/lib/shop.functions";
import { checkout, putBack, removeProduct, saveOffer, saveProduct, saveSettings, lockDesk, changeDeskCode, unlockDesk, connectStripe, syncStripe, markOrderPaid, releaseOrder } from "@/lib/shop.functions";
import { CATEGORIES, dollarsToCents, money } from "@/lib/money";
import { FeaturedShelf } from "@/components/boutique/FeaturedShelf";

type Draft = {
  id: string;
  name: string;
  summary: string;
  description: string;
  price: string;
  cost: string;
  category: string;
  image: string;
  imageBack: string;
  imageLeft: string;
  imageRight: string;
  featured: boolean;
  featureOrder: string;
  listOrder: string;
};

type Note = { id: string; name: string; email: string; note: string };

const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  summary: "",
  description: "",
  price: "",
  cost: "",
  category: "Animals",
  image: "",
  imageBack: "",
  imageLeft: "",
  imageRight: "",
  featured: false,
  featureOrder: "0",
  listOrder: "0",
});

function fromProduct(product: DeskProduct): Draft {
  return {
    id: product.id,
    name: product.name,
    summary: product.summary,
    description: product.description,
    price: (product.priceCents / 100).toString(),
    cost: product.costCents ? (product.costCents / 100).toString() : "",
    category: product.category,
    image: product.image,
    imageBack: product.imageBack,
    imageLeft: product.imageLeft,
    imageRight: product.imageRight,
    featured: product.featured,
    featureOrder: String(product.featureOrder),
    listOrder: String(product.listOrder),
  };
}

function liftBackground(img: HTMLImageElement, tolerance: number) {
  const max = 640;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = image;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const index of corners) {
    r += data[index * 4];
    g += data[index * 4 + 1];
    b += data[index * 4 + 2];
  }
  r /= corners.length;
  g /= corners.length;
  b /= corners.length;
  const seen = new Uint8Array(width * height);
  const stack = [...corners];
  const limit = tolerance * tolerance * 3;
  while (stack.length) {
    const index = stack.pop()!;
    if (seen[index]) continue;
    seen[index] = 1;
    const offset = index * 4;
    const dr = data[offset] - r;
    const dg = data[offset + 1] - g;
    const db = data[offset + 2] - b;
    if (dr * dr + dg * dg + db * db > limit) continue;
    data[offset + 3] = 0;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (y > 0) stack.push(index - width);
    if (y < height - 1) stack.push(index + width);
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function PieceRow({
  product,
  onSave,
  onPhotos,
}: {
  product: DeskProduct;
  onSave: (product: DeskProduct, patch: { name: string; price: string; summary: string; category: string }) => Promise<void>;
  onPhotos: () => void;
}) {
  const priceText = (product.priceCents / 100).toString();
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(priceText);
  const [summary, setSummary] = useState(product.summary);
  const [category, setCategory] = useState(product.category);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setName(product.name);
    setPrice(priceText);
    setSummary(product.summary);
    setCategory(product.category);
  }, [product.name, product.summary, product.category, priceText]);
  const dirty = name !== product.name || price !== priceText || summary !== product.summary || category !== product.category;
  return (
    <li className="py-4">
      <div className="flex gap-3">
        <img src={product.image || "/logo.png"} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-plaster object-contain" />
        <div className="grid min-w-0 flex-1 gap-2">
          <input className="min-h-11 rounded-xl border border-line bg-plaster px-3" aria-label={`Name for ${product.name}`} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="min-h-11 rounded-xl border border-line bg-plaster px-3" aria-label={`Price for ${product.name}`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            <select className="min-h-11 rounded-xl border border-line bg-plaster px-3" aria-label={`Category for ${product.name}`} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <input className="min-h-11 rounded-xl border border-line bg-plaster px-3" aria-label={`About ${product.name}`} placeholder="One line about it" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{product.sold ? "Sold" : "On the shelf"}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full bg-sage px-4 text-on-sage disabled:opacity-40"
          disabled={!dirty || saving}
          onClick={() => {
            setSaving(true);
            void onSave(product, { name, price, summary, category }).finally(() => setSaving(false));
          }}
        >
          {saving ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
        <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={onPhotos}>
          Photos
        </button>
      </div>
    </li>
  );
}

export function Desk({ initial }: { initial: DeskPayload }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial.settings);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tolerance, setTolerance] = useState(36);
  const [offerCode, setOfferCode] = useState("");
  const [offerLabel, setOfferLabel] = useState("");
  const [offerPercent, setOfferPercent] = useState("10");
  const [notes, setNotes] = useState<Note[]>([]);
  const [note, setNote] = useState({ name: "", email: "", note: "" });
  const [nextCode, setNextCode] = useState("");
  const [stripeKey, setStripeKey] = useState("");
  const [quick, setQuick] = useState({ name: "", price: "", summary: "", category: "Animals", image: "" });

  useEffect(() => {
    const raw = localStorage.getItem("wtc-notebook");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Note[];
      if (Array.isArray(parsed)) setNotes(parsed);
    } catch {
      /* ignore a bad notebook */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wtc-notebook", JSON.stringify(notes));
  }, [notes]);

  async function refresh(text: string) {
    setMessage(text);
    setError("");
    await router.invalidate();
  }

  async function saveShop() {
    try {
      await saveSettings({ data: settings });
      await refresh("Shop details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  async function addPiece() {
    const priceCents = dollarsToCents(quick.price);
    if (!quick.name.trim()) {
      setError("Add a name.");
      return;
    }
    if (priceCents == null) {
      setError("Add a price, like 24 or 24.50.");
      return;
    }
    try {
      const result = await saveProduct({
        data: {
          id: "",
          name: quick.name,
          summary: quick.summary,
          description: quick.summary,
          priceCents,
          costCents: 0,
          category: quick.category,
          image: quick.image,
          imageBack: "",
          imageLeft: "",
          imageRight: "",
          featured: false,
          featureOrder: 0,
          listOrder: initial.products.length + 1,
          origin: window.location.origin,
        },
      });
      setQuick({ name: "", price: "", summary: "", category: "Animals", image: "" });
      await refresh(result.stripeNote ? `Added. ${result.stripeNote}` : "Added. It's on the shop.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that piece.");
    }
  }

  async function saveLine(product: DeskProduct, patch: { name: string; price: string; summary: string; category: string }) {
    const priceCents = dollarsToCents(patch.price);
    if (!patch.name.trim()) {
      setError("A piece needs a name.");
      return;
    }
    if (priceCents == null) {
      setError("Price needs to be a number.");
      return;
    }
    try {
      const result = await saveProduct({
        data: {
          id: product.id,
          name: patch.name,
          summary: patch.summary,
          description: product.description,
          priceCents,
          costCents: product.costCents,
          category: patch.category,
          image: product.image,
          imageBack: product.imageBack,
          imageLeft: product.imageLeft,
          imageRight: product.imageRight,
          featured: product.featured,
          featureOrder: product.featureOrder,
          listOrder: product.listOrder,
          origin: window.location.origin,
        },
      });
      await refresh(result.stripeNote ? `Saved. ${result.stripeNote}` : "Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that piece.");
    }
  }

  function readPhoto(file: File | undefined, apply: (url: string) => void) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        apply(canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.82));
      };
      img.onerror = () => setError("That photo didn't open. Use a JPG or a screenshot.");
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  }

  async function saveItem() {
    if (!draft) return;
    const priceCents = dollarsToCents(draft.price);
    const costCents = draft.cost.trim() ? dollarsToCents(draft.cost) : 0;
    if (priceCents == null || costCents == null) {
      setError("Price and cost need to be numbers.");
      return;
    }
    try {
      const result = await saveProduct({
        data: {
          id: draft.id,
          name: draft.name,
          summary: draft.summary,
          description: draft.description,
          priceCents,
          costCents,
          category: draft.category,
          image: draft.image,
          imageBack: draft.imageBack,
          imageLeft: draft.imageLeft,
          imageRight: draft.imageRight,
          featured: draft.featured,
          featureOrder: Number(draft.featureOrder) || 0,
          listOrder: Number(draft.listOrder) || 0,
          origin: window.location.origin,
        },
      });
      setDraft(null);
      await refresh(result.stripeNote ? `Item saved. ${result.stripeNote}` : "Item saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the item.");
    }
  }

  function onFile(slot: "image" | "imageBack" | "imageLeft" | "imageRight", file: File | undefined) {
    if (!file || !draft) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const png = file.type === "image/png";
        setDraft((current) => (current ? { ...current, [slot]: canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.86) } : current));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function standUp(slot: "image" | "imageBack" | "imageLeft" | "imageRight") {
    if (!draft?.[slot]) return;
    const img = new Image();
    img.onload = () => setDraft({ ...draft, [slot]: liftBackground(img, tolerance) });
    img.src = draft[slot];
  }

  const preview = draft?.image
    ? [
        {
          id: draft.id || "preview",
          name: draft.name || "New piece",
          summary: draft.summary,
          description: draft.description,
          priceCents: dollarsToCents(draft.price) ?? 0,
          category: draft.category,
          image: draft.image,
          imageBack: "",
          imageLeft: "",
          imageRight: "",
          stripeLink: "",
          featured: true,
          featureOrder: 1,
          listOrder: 1,
          sold: false,
          listedAt: new Date().toISOString(),
        },
      ]
    : [];

  const featured = initial.products.filter((product) => product.featured && !product.sold);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-plaster/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <p className="font-display text-lg">Shop desk</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm"
              onClick={() => void lockDesk({ data: {} }).then(() => router.invalidate())}
            >
              Lock
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm"
              onClick={() => void lockDesk({ data: {} }).then(() => router.navigate({ to: "/" }))}
            >
              View shop
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {(message || error) && <p className={error ? "text-brass-deep" : "text-ink-soft"}>{error || message}</p>}

        <section className="rounded-card border border-line bg-card p-4">
          <h1 className="font-display text-3xl">Add a piece</h1>
          <p className="mt-1 text-ink-soft">Name, price, and one photo. That’s enough to put it on the shop.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Name
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
            </label>
            <label className="text-sm">
              Price
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" inputMode="decimal" placeholder="24" value={quick.price} onChange={(e) => setQuick({ ...quick, price: e.target.value })} />
            </label>
            <label className="text-sm">
              Category
              <select className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={quick.category} onChange={(e) => setQuick({ ...quick, category: e.target.value })}>
                {CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              One line
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" placeholder="Handmade, ready to go" value={quick.summary} onChange={(e) => setQuick({ ...quick, summary: e.target.value })} />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            Photo
            <input className="mt-2 block w-full text-sm" type="file" accept="image/*" onChange={(e) => readPhoto(e.target.files?.[0], (image) => setQuick((current) => ({ ...current, image })))} />
          </label>
          {quick.image && <img src={quick.image} alt="" className="mt-3 h-32 rounded-xl bg-plaster object-contain" />}
          <button type="button" className="mt-4 min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => void addPiece()}>
            Add to the shop
          </button>
        </section>

        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="font-display text-2xl">People waiting</h2>
          <p className="mt-1 text-sm text-ink-soft">A hold is not a payment. Mark it paid when the money is in. That takes the piece off the shelf.</p>
          {initial.orders.filter((order) => order.status === "requested").length === 0 ? (
            <p className="mt-3 text-ink-soft">No one is waiting.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {initial.orders
                .filter((order) => order.status === "requested")
                .map((order) => (
                  <li key={order.id} className="py-3 text-sm">
                    <p className="font-medium">{order.productName} · {money(order.amountCents)}</p>
                    <p className="text-ink-soft">
                      {order.buyerName} · {order.buyerEmail}
                      {order.buyerPhone ? ` · ${order.buyerPhone}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => void markOrderPaid({ data: { id: order.id } }).then(() => refresh("Marked paid and taken off the shelf."))}>
                        Mark paid
                      </button>
                      <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void releaseOrder({ data: { id: order.id } }).then(() => refresh("Hold released."))}>
                        Let it go
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-line bg-card p-4">
          <h1 className="font-display text-3xl">This week</h1>
          <p className="mt-1 text-ink-soft">The line under the sign, and the link that goes on the price-tag QR.</p>
          <label className="mt-4 block text-sm">
            Shop name
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={settings.shopName} onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} />
          </label>
          <label className="mt-3 block text-sm">
            This week
            <textarea className="mt-1 min-h-24 w-full rounded-xl border border-line bg-plaster px-3 py-2" value={settings.weekNote} onChange={(e) => setSettings({ ...settings, weekNote: e.target.value })} />
          </label>
          <label className="mt-3 block text-sm">
            Shop email for orders
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} />
          </label>
          <label className="mt-3 block text-sm">
            Stripe link
            <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={settings.stripeUrl} onChange={(e) => setSettings({ ...settings, stripeUrl: e.target.value })} />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => void saveShop()}>
              Save
            </button>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4" href={settings.stripeUrl} target="_blank" rel="noreferrer">
              Open Stripe <ExternalLink size={16} aria-hidden />
            </a>
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-4"
              onClick={() =>
                void syncStripe({ data: { origin: window.location.origin } })
                  .then((result) => refresh(result.errors.length ? result.errors.join(" ") : `Sent ${result.synced} pieces to Stripe.`))
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't send the pieces."))
              }
            >
              Send all to Stripe
            </button>
            <Link to="/tag" className="inline-flex min-h-11 items-center rounded-full border border-line px-4">
              Price tag
            </Link>
          </div>
          <div className="mt-4 rounded-xl border border-line bg-plaster p-3">
            <p className="font-medium">{settings.stripeReady ? "Stripe is connected" : "Connect Stripe once"}</p>
            <p className="mt-1 text-sm text-ink-soft">
              Save a piece here and it is listed on Stripe with the same name and price. The pay page shows that name and the shop logo. Use a restricted key if you have one.
            </p>
            <label className="mt-3 block text-sm">
              Stripe secret key
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-line bg-card px-3"
                type="password"
                autoComplete="off"
                placeholder="sk_live_ or rk_live_"
                value={stripeKey}
                onChange={(event) => setStripeKey(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="mt-3 min-h-11 rounded-full bg-sage px-4 text-on-sage"
              onClick={() =>
                void connectStripe({ data: { key: stripeKey, origin: window.location.origin } })
                  .then((result) => {
                    setStripeKey("");
                    return refresh(
                      result.errors.length
                        ? `Connected. ${result.errors.join(" ")}`
                        : `Connected. ${result.synced} pieces are on Stripe.`,
                    );
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't connect Stripe."))
              }
            >
              Connect and send every piece
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              New desk code
              <input className="mt-1 min-h-11 rounded-xl border border-line bg-plaster px-3" type="password" value={nextCode} onChange={(e) => setNextCode(e.target.value)} />
            </label>
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-4"
              onClick={() =>
                void changeDeskCode({ data: { next: nextCode } })
                  .then(() => {
                    setNextCode("");
                    return refresh("Desk code changed. The old code no longer works.");
                  })
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : "Couldn't change the code."))
              }
            >
              Change code
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Featured shelf</h2>
            <p className="text-sm text-ink-soft">{featured.length} up</p>
          </div>
          <div className="mt-4">
            <FeaturedShelf products={featured} heldId={null} onPick={(id) => {
              const product = initial.products.find((item) => item.id === id);
              if (product) setDraft(fromProduct(product));
            }} />
          </div>
        </section>

        <section className="rounded-card border border-line bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Inventory</h2>
            <Link to="/inventory" className="inline-flex min-h-11 items-center rounded-full border border-line px-4">
              Print list
            </Link>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Change the name, price, or line right here, then tap Save.</p>
          <ul className="mt-2 divide-y divide-line">
            {initial.products.map((product) => (
              <PieceRow key={product.id} product={product} onSave={saveLine} onPhotos={() => setDraft(fromProduct(product))} />
            ))}
          </ul>
        </section>

        {draft && (
          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="font-display text-2xl">{draft.id ? "Edit item" : "New item"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
              <Field label="Price" value={draft.price} onChange={(price) => setDraft({ ...draft, price })} />
              <Field label="What it cost you" value={draft.cost} onChange={(cost) => setDraft({ ...draft, cost })} />
              <label className="text-sm">
                Classification
                <select className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <Field label="Listing order" value={draft.listOrder} onChange={(listOrder) => setDraft({ ...draft, listOrder })} />
              <Field label="Featured order" value={draft.featureOrder} onChange={(featureOrder) => setDraft({ ...draft, featureOrder })} />
            </div>
            <label className="mt-3 block text-sm">
              Short line
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </label>
            <label className="mt-3 block text-sm">
              Description
              <textarea className="mt-1 min-h-24 w-full rounded-xl border border-line bg-plaster px-3 py-2" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <label className="mt-3 flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
              On the featured shelf
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["image", "Front"],
                  ["imageBack", "Back"],
                  ["imageLeft", "Left"],
                  ["imageRight", "Right"],
                ] as const
              ).map(([slot, label]) => (
                <div key={slot} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium">{label}</p>
                  {draft[slot] && <img src={draft[slot]} alt="" className="mt-2 h-28 w-full bg-plaster object-contain" />}
                  <input className="mt-2 block w-full text-sm" type="file" accept="image/*" onChange={(e) => onFile(slot, e.target.files?.[0])} />
                  <div className="mt-2 flex items-center gap-3">
                    <input aria-label="Background lift" type="range" min={8} max={80} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
                    <button type="button" className="min-h-11 rounded-full border border-line px-4 text-sm" onClick={() => standUp(slot)}>
                      Make shelf cutout
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-soft">Shoot each side on white. Front is the photo that sits on the shelf. Cutout lifts the white so the piece looks like it is standing there. Keep the featured shelf to four pieces.</p>
            {preview.length > 0 && (
              <div className="mt-4">
                <FeaturedShelf products={preview} heldId={null} onPick={() => {}} />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => void saveItem()}>
                Save item
              </button>
              <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => setDraft(null)}>
                Cancel
              </button>
              {draft.id && (
                <>
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-line px-4"
                    onClick={() =>
                      void checkout({ data: { productId: draft.id, offerCode: "", channel: "show" } }).then(() => refresh("Marked sold at the show."))
                    }
                  >
                    Sold at the show
                  </button>
                  <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => void putBack({ data: { id: draft.id } }).then(() => refresh("Put back on the shelf."))}>
                    Put back
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-full border border-line px-4"
                    onClick={() => void removeProduct({ data: { id: draft.id } }).then(() => { setDraft(null); return refresh("Item removed."); })}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="font-display text-2xl">Offers</h2>
          <ul className="mt-3 space-y-2">
            {initial.offers.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {offer.code} · {offer.percent}% · {offer.label} {offer.active ? "" : "· off"}
                </span>
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-4"
                  onClick={() => void saveOffer({ data: { ...offer, active: !offer.active } }).then(() => refresh(offer.active ? "Offer turned off." : "Offer turned on."))}
                >
                  {offer.active ? "Turn off" : "Turn on"}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Code" value={offerCode} onChange={setOfferCode} />
            <Field label="Percent" value={offerPercent} onChange={setOfferPercent} />
            <Field label="Label" value={offerLabel} onChange={setOfferLabel} />
          </div>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-full bg-sage px-4 text-on-sage"
            onClick={() =>
              void saveOffer({ data: { code: offerCode, label: offerLabel, percent: Number(offerPercent), active: true } }).then(() => {
                setOfferCode("");
                setOfferLabel("");
                return refresh("Offer saved.");
              })
            }
          >
            Add offer
          </button>
        </section>

        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="font-display text-2xl">Sales</h2>
          <p className="mt-2 text-lg">
            {money(initial.revenueCents)} in · {money(initial.profitCents)} after cost
          </p>
          <p className="text-sm text-ink-soft">Profit uses the cost you typed on each item. Leave cost blank and profit matches the price.</p>
          {initial.sales.length === 0 ? (
            <p className="mt-4 text-ink-soft">No sales yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {initial.sales.map((sale) => (
                <li key={sale.id} className="py-3 text-sm">
                  <span className="font-medium">{sale.productName}</span> · {money(sale.amountCents)} · {sale.channel}
                  {sale.offerCode ? ` · ${sale.offerCode}` : ""} · {sale.soldAt.slice(0, 10)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="font-display text-2xl">People on this phone</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Names and emails you write here stay on this phone. They are not saved on the public shop.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Name" value={note.name} onChange={(name) => setNote({ ...note, name })} />
            <Field label="Email" value={note.email} onChange={(email) => setNote({ ...note, email })} />
            <Field label="Note" value={note.note} onChange={(value) => setNote({ ...note, note: value })} />
          </div>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-full bg-ink px-4 text-plaster"
            onClick={() => {
              if (!note.name && !note.email) return;
              setNotes([{ id: crypto.randomUUID(), ...note }, ...notes]);
              setNote({ name: "", email: "", note: "" });
            }}
          >
            Save on this phone
          </button>
          <ul className="mt-4 divide-y divide-line">
            {notes.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium">{entry.name || "No name"}</span>
                  {entry.email ? ` · ${entry.email}` : ""}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
                <button type="button" className="min-h-11 text-ink-soft" onClick={() => setNotes(notes.filter((item) => item.id !== entry.id))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export function DeskGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await unlockDesk({ data: { password } });
    if (!result.ok) {
      setError("That code doesn't open the desk.");
      return;
    }
    setError("");
    await router.invalidate();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm font-medium tracking-widest text-brass">WHAT THE CRAFT GIFTS</p>
      <h1 className="mt-2 font-display text-4xl">Shop desk</h1>
      <p className="mt-3 text-ink-soft">This side is locked. Shoppers never see prices you haven't published, sales, or the Stripe link.</p>
      <form className="mt-6" onSubmit={(event) => void submit(event)}>
        <label className="text-sm">
          Desk code
          <input
            className="mt-1 min-h-11 w-full rounded-xl border border-line bg-card px-3"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="mt-2 text-sm text-brass-deep">{error}</p>}
        <button type="submit" className="mt-4 min-h-11 w-full rounded-full bg-sage px-4 text-on-sage">
          Open desk
        </button>
      </form>
      <Link to="/" className="mt-4 inline-flex min-h-11 items-center text-sm text-ink-soft">
        Back to the shop
      </Link>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm">
      {label}
      <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
