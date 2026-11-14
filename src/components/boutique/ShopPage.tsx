import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { ShopPayload } from "@/lib/shop.functions";
import { confirmPaid, lockDesk } from "@/lib/shop.functions";
import { CATEGORIES, money } from "@/lib/money";
import { FeaturedShelf } from "@/components/boutique/FeaturedShelf";
import { ItemDialog } from "@/components/boutique/ItemDialog";

const SORTS = [
  { id: "shelf", label: "Shelf order" },
  { id: "price-asc", label: "Price, low" },
  { id: "price-desc", label: "Price, high" },
  { id: "name", label: "Name" },
  { id: "newest", label: "Newest" },
  { id: "longest", label: "On the shelf longest" },
] as const;

const BANDS = [
  { id: "all", label: "Any price" },
  { id: "under", label: "Under $25" },
  { id: "mid", label: "$25 to $40" },
  { id: "over", label: "$40 and up" },
] as const;

type Band = (typeof BANDS)[number]["id"];

function inBand(cents: number, band: Band) {
  if (band === "under") return cents < 2500;
  if (band === "mid") return cents >= 2500 && cents < 4000;
  if (band === "over") return cents >= 4000;
  return true;
}

export function ShopPage({ data }: { data: ShopPayload }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [band, setBand] = useState<Band>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("shelf");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"shelf" | "card">("shelf");

  const available = data.products.filter((product) => !product.sold);
  const featured = available
    .filter((product) => product.featured)
    .sort((a, b) => a.featureOrder - b.featureOrder || a.listOrder - b.listOrder);
  const open = data.products.find((product) => product.id === openId);
  const tiles = CATEGORIES.map((name) => {
    const pieces = available.filter((product) => product.category === name);
    return { name, count: pieces.length, image: pieces[0]?.image ?? "" };
  }).filter((tile) => tile.count > 0);

  useEffect(() => {
    void lockDesk({ data: {} });
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("paid");
    if (!sessionId) return;
    void confirmPaid({ data: { sessionId } }).finally(() => {
      window.history.replaceState({}, "", window.location.pathname);
      void router.invalidate();
    });
  }, [router]);

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = available.filter((product) => {
      const hay = `${product.name} ${product.summary} ${product.category}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (category !== "All" && product.category !== category) return false;
      if (!inBand(product.priceCents, band)) return false;
      return true;
    });
    rows.sort((a, b) => {
      if (sort === "price-asc") return a.priceCents - b.priceCents;
      if (sort === "price-desc") return b.priceCents - a.priceCents;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "newest") return Date.parse(b.listedAt) - Date.parse(a.listedAt);
      if (sort === "longest") return Date.parse(a.listedAt) - Date.parse(b.listedAt);
      return a.listOrder - b.listOrder;
    });
    return rows;
  }, [available, query, category, band, sort]);

  function pick(id: string, next: "shelf" | "card") {
    setMode(next);
    setOpenId(id);
  }

  function shopCategory(name: string) {
    setCategory(name);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-plaster/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <p className="flex items-center gap-2 font-display text-lg leading-tight">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg" />
            <span>
              {data.settings.shopName}
              <span className="mt-0.5 block font-sans text-xs font-normal tracking-wide text-ink-soft">Springfield, Ohio</span>
            </span>
          </p>
          <Link to="/admin" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm">
            Shop desk
          </Link>
        </div>
      </header>
      {data.settings.weekNote && (
        <p className="bg-ink px-4 py-2 text-center text-sm text-plaster">{data.settings.weekNote}</p>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mx-auto max-w-xl border-8 border-brass bg-card px-6 py-8 text-center">
          <p className="text-sm font-medium tracking-widest text-brass">HANDMADE</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">{data.settings.shopName}</h1>
          <p className="mt-3 text-ink-soft">Finished pieces, one of each. Pick one up and take it home.</p>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl">Fresh picks</h2>
          <div className="mt-4">
            <FeaturedShelf products={featured} heldId={mode === "shelf" ? openId : null} onPick={(id) => pick(id, "shelf")} />
          </div>
        </section>

        <section className="mt-12 grid gap-6 rounded-card border border-line bg-card p-5 sm:grid-cols-[1fr_1.4fr] sm:items-center">
          <div>
            <p className="text-sm font-medium tracking-widest text-brass">THE MAKER</p>
            <h2 className="mt-1 font-display text-3xl">Mona</h2>
            <p className="text-ink-soft">Springfield, Ohio</p>
          </div>
          <p className="text-ink-soft">
            Mona finishes every piece by hand. What you see is what’s for sale. One of each, ready now, not made to order.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl">Shop by category</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
              <li key={tile.name}>
                <button
                  type="button"
                  className={`w-full overflow-hidden rounded-card border text-left ${category === tile.name ? "border-ink" : "border-line"} bg-card`}
                  onClick={() => shopCategory(tile.name)}
                >
                  <img src={tile.image} alt="" className="aspect-square w-full bg-plaster object-contain" />
                  <span className="flex min-h-11 items-center justify-between gap-2 px-3">
                    <span className="font-medium">{tile.name}</span>
                    <span className="text-sm text-ink-soft">{tile.count}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section id="shop" className="mt-12 scroll-mt-24">
          <h2 className="font-display text-2xl">The shop</h2>
          <p className="mt-1 text-ink-soft">Every finished piece. Search, or shop by price.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-h-11 flex-1 rounded-xl border border-line bg-card px-3"
              placeholder="Search the shop"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search the shop"
            />
            <select
              className="min-h-11 rounded-xl border border-line bg-card px-3"
              value={sort}
              onChange={(event) => setSort(event.target.value as (typeof SORTS)[number]["id"])}
              aria-label="Sort"
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {BANDS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`min-h-11 rounded-full border px-4 text-sm ${band === option.id ? "border-ink bg-ink text-plaster" : "border-line bg-card"}`}
                onClick={() => setBand(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["All", ...CATEGORIES].map((name) => (
              <button
                key={name}
                type="button"
                className={`min-h-11 rounded-full border px-4 text-sm ${category === name ? "border-ink bg-ink text-plaster" : "border-line bg-card"}`}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>
          {listed.length === 0 ? (
            <p className="mt-8 text-ink-soft">Nothing in that selection.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listed.map((product) => (
                <li key={product.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-card">
                  <button type="button" className="block w-full" onClick={() => pick(product.id, "card")}>
                    <img src={product.image} alt="" className="aspect-square w-full bg-plaster object-contain" />
                  </button>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-xs tracking-wide text-brass">{product.category} · One of a kind</p>
                    <h3 className="mt-1 font-display text-xl leading-tight">{product.name}</h3>
                    <p className="mt-1 text-ink-soft">{product.summary}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-lg">{money(product.priceCents)}</p>
                      <button type="button" className="min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => pick(product.id, "card")}>
                        Buy now
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <footer className="border-t border-line px-4 py-8 text-center text-sm text-ink-soft">
        Handmade in Springfield. One of each piece.
      </footer>

      {open && (
        <ItemDialog
          product={open}
          offers={data.offers}
          mode={mode}
          onClose={() => setOpenId(null)}
          onBought={() => void router.invalidate()}
        />
      )}
    </div>
  );
}
