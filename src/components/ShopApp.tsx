import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { productById, products, spotByKey, spots, spotsFor } from "@/shop/catalog";
import { orderPlainText, useOrders, type Purchase } from "@/shop/orders";
import { mountShop, type ShopHandle } from "@/shop/mountShop";

type Panel = "none" | "shop" | "book" | "buy" | "done";

export function ShopApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const shopRef = useRef<ShopHandle | null>(null);
  const wantStart = useRef(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const [activeKey, setActiveKey] = useState<string>(spots[0].key);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Purchase | null>(null);
  const [copied, setCopied] = useState(false);
  const [hand, setHand] = useState(true);
  const [shareNote, setShareNote] = useState("");
  const orders = useOrders((s) => s.orders);
  const soldSpotKeys = useOrders((s) => s.soldSpotKeys);
  const addOrder = useOrders((s) => s.add);
  const removeOrder = useOrders((s) => s.remove);
  const [hydrated, setHydrated] = useState(false);
  const sold = new Set(hydrated ? soldSpotKeys : []);

  const soldRef = useRef<Set<string>>(new Set());
  soldRef.current = sold;

  const openBuy = (key: string) => {
    if (soldRef.current.has(key)) return;
    setActiveKey(key);
    setPanel("buy");
    setSaved(null);
  };

  useEffect(() => {
    const fit = () => {
      const main = mainRef.current;
      if (!main) return;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      const top = Math.max(0, main.getBoundingClientRect().top);
      main.style.height = `${Math.max(280, viewport - top)}px`;
    };
    fit();
    const later = window.setTimeout(fit, 400);
    window.visualViewport?.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("scroll", fit);
    window.addEventListener("resize", fit);
    return () => {
      window.clearTimeout(later);
      window.visualViewport?.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const detect = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const touch =
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(hover: none)").matches;
      setHand(touch || width < 1024);
    };
    detect();
    window.addEventListener("resize", detect);
    window.visualViewport?.addEventListener("resize", detect);
    return () => {
      window.removeEventListener("resize", detect);
      window.visualViewport?.removeEventListener("resize", detect);
    };
  }, []);

  useEffect(() => {
    shopRef.current?.setPaused(panel !== "none");
  }, [panel]);

  useEffect(() => {
    if (!ready || started) return;
    const touch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || window.innerWidth < 900;
    if (touch) begin();
  }, [ready, started]);

  useEffect(() => {
    void useOrders.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (ready) shopRef.current?.setSold(soldSpotKeys);
  }, [ready, soldSpotKeys]);

  useEffect(() => {
    let cancelled = false;
    let handle: ShopHandle | null = null;
    const api = {
      onFocused: (key: string | null) => {
        if (!cancelled) setFocusedKey(key);
      },
      onBuy: (key: string) => {
        if (cancelled) return;
        openBuy(key);
      },
      onEngage: () => {
        if (cancelled) return;
        begin();
      },
    };
    (async () => {
      try {
        if (cancelled || !hostRef.current) return;
        handle = mountShop(hostRef.current, api);
        shopRef.current = handle;
        handle.setSold(useOrders.getState().soldSpotKeys);
        if (wantStart.current) handle.start();
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The shop couldn't open.");
      }
    })();
    return () => {
      cancelled = true;
      handle?.dispose();
      shopRef.current = null;
    };
  }, []);

  function begin() {
    wantStart.current = true;
    setStarted(true);
    shopRef.current?.start();
  }

  function closePanel() {
    setPanel("none");
    setSaved(null);
  }

  const focusedSpot = focusedKey ? spotByKey(focusedKey) : undefined;
  const focused = focusedSpot ? productById(focusedSpot.productId) : undefined;
  const focusedSold = focusedSpot ? sold.has(focusedSpot.key) : false;
  const buyingSpot = spotByKey(activeKey) ?? spots[0];
  const buying = productById(buyingSpot.productId) ?? products[0];
  const count = hydrated ? orders.length : 0;
  const readyCount = spots.length - sold.size;

  return (
    <main ref={mainRef} className="relative w-full overflow-hidden bg-plaster font-sans text-ink" style={{ height: "100svh" }}>
      <div ref={hostRef} className="absolute inset-0" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 bg-card/90 px-3 py-2 backdrop-blur-md pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto min-w-0">
          <p className="font-display text-2xl leading-none md:text-3xl">Mona's</p>
          <p className="text-xs text-ink-soft md:text-sm">Handmade</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1.5">
          <button type="button" className="min-h-11 rounded-full border border-line bg-card px-3 text-sm md:px-4" onClick={() => setPanel("shop")}>
            Shop
          </button>
          <button type="button" className="min-h-11 rounded-full border border-line bg-card px-3 text-sm md:px-4" onClick={() => setPanel("book")}>
            Purchases{count > 0 ? ` ${count}` : ""}
          </button>
          <button type="button" className="min-h-11 rounded-full border border-line bg-card px-3 text-sm md:px-4" onClick={() => void shareShop(setShareNote)}>
            Share
          </button>
        </div>
      </header>
      {shareNote && (
        <p className="absolute right-4 top-20 z-20 max-w-xs rounded-xl border border-line bg-card px-3 py-2 text-right text-sm text-ink-soft shadow-lg md:right-6">
          {shareNote}
        </p>
      )}

      {started && panel === "none" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink" />
      )}

      {!started && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 md:inset-y-0 md:left-0 md:flex md:w-full md:max-w-md md:items-center md:p-8">
          <div className="w-full rounded-card border border-line bg-card/95 p-6 shadow-lg backdrop-blur-md">
            <p className="text-sm font-medium tracking-widest text-brass">READY NOW</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">Walk Mona’s shop</h1>
            <p className="mt-3 text-pretty text-ink-soft">
              Finished handmade pieces, already made and sitting on the shelves. {readyCount} ready to buy. No craft-show table, no hold, no deposit.
            </p>
            <button
              type="button"
              className="mt-6 min-h-11 w-full rounded-full bg-ink px-5 text-plaster md:w-auto"
              onClick={begin}
            >
              {error ? "Can't start" : ready ? "Start" : "Opening the shop"}
            </button>
            <p className="mt-3 text-sm text-ink-soft">WASD or arrows to walk. Drag to look. Click a piece, or press E, to buy it.</p>
            {error && <p className="mt-3 text-sm text-brass-deep">{error}</p>}
          </div>
        </div>
      )}

      {started && focused && focusedSpot && panel === "none" && (
        <article
          className={
            hand
              ? "absolute inset-x-3 bottom-48 z-50 overflow-hidden rounded-card border border-line bg-card p-4 shadow-lg"
              : "absolute bottom-6 right-6 z-50 w-96 overflow-hidden rounded-card border border-line bg-card p-4 shadow-lg"
          }
        >
          <div className="flex gap-3">
            <Cutout src={focused.cutout} alt={focused.name} className="h-28 w-24" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl leading-tight">{focused.name}</h2>
              <p className="text-sm text-ink-soft">{focused.size}</p>
              <p className="mt-1 font-medium tabular-nums">{focusedSold ? "Sold" : `$${focused.price}`}</p>
            </div>
          </div>
          <p className="mt-3 text-pretty text-sm leading-snug text-ink-soft">{focused.summary}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-full bg-ink px-4 text-plaster disabled:opacity-40"
              disabled={focusedSold}
              onClick={() => openBuy(focusedSpot.key)}
            >
              {focusedSold ? "Sold" : `Buy now · $${focused.price}`}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-4"
              onClick={(e) => {
                e.stopPropagation();
                setFocusedKey(null);
                shopRef.current?.clearFocus();
              }}
            >
              Close
            </button>
          </div>
        </article>
      )}

      {hand && (
        <div
          className="move-stick"
          style={{
            position: "absolute",
            left: 12,
            bottom: "max(16px, env(safe-area-inset-bottom))",
            zIndex: 40,
          }}
        >
          <Stick
            onChange={(x, y) => {
              begin();
              shopRef.current?.setAnalog(x, y);
            }}
          />
          <p className="mt-1 text-center text-xs text-ink-soft">Hold to walk</p>
        </div>
      )}

      {!hand && started && panel === "none" && !focused && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 text-sm text-ink-soft md:block">
          Drag to look · WASD to walk · E to buy
        </p>
      )}

      {!hand && started && (
        <button
          type="button"
          className="absolute bottom-4 left-4 z-20 hidden min-h-11 rounded-full border border-line bg-card px-4 text-sm md:block"
          onClick={() => shopRef.current?.requestMouseLook()}
        >
          Mouse look
        </button>
      )}

      {panel === "shop" && (
        <Sheet title="In the shop" onClose={() => setPanel("none")}>
          <p className="text-sm text-ink-soft">Finished pieces on the shelves. Each one is the actual item, not a custom order.</p>
          <ul className="mt-4 flex flex-col gap-4">
            {products.map((product) => {
              const available = spotsFor(product.id).filter((spot) => !sold.has(spot.key));
              return (
                <li key={product.id} className="flex gap-3 border-b border-line pb-4 last:border-0">
                  <Cutout src={product.cutout} alt="" className="h-24 w-20" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl">{product.name}</h3>
                    <p className="text-sm text-ink-soft">{product.size}</p>
                    <p className="mt-1 text-sm text-pretty text-ink-soft">{product.summary}</p>
                    <p className="mt-1 tabular-nums">
                      ${product.price} · {available.length} ready
                    </p>
                    <button
                      type="button"
                      className="mt-2 min-h-11 rounded-full bg-ink px-4 text-sm text-plaster disabled:opacity-40"
                      disabled={available.length === 0}
                      onClick={() => available[0] && openBuy(available[0].key)}
                    >
                      {available.length === 0 ? "Sold out" : "Buy now"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}

      {panel === "book" && (
        <Sheet title="Purchases" onClose={() => setPanel("none")}>
          <p className="text-sm text-ink-soft">
            Saved on this device. Taking one off the list puts that piece back on the shelf. Nothing is charged until Mona collects.
          </p>
          {orders.length === 0 ? (
            <p className="mt-4 text-ink-soft">No purchases yet. Walk up to a piece and buy it.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {orders.map((order) => (
                <li key={order.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg">{order.productName}</h3>
                    <span className="text-sm tabular-nums text-ink-soft">{order.id}</span>
                  </div>
                  <p className="text-sm">
                    {order.buyerName} · {order.email}
                  </p>
                  <p className="text-sm tabular-nums">${order.total} · ready now</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" onClick={() => copyOrder(order, () => setCopied(true))}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button type="button" className="min-h-11 rounded-full border border-line px-3 text-sm" onClick={() => removeOrder(order.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      )}

      {(panel === "buy" || panel === "done") && (
        <Sheet title={panel === "done" ? "Purchase saved" : buying.name} onClose={closePanel}>
          {panel === "done" && saved ? (
            <div>
              <p className="text-pretty">
                {saved.id} is saved on this device and that piece is off the shelf. Nothing was charged. Mona confirms the ${saved.total} and collects it.
              </p>
              <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{orderPlainText(saved)}</p>
              <button type="button" className="mt-4 min-h-11 rounded-full bg-ink px-4 text-plaster" onClick={() => copyOrder(saved, () => setCopied(true))}>
                {copied ? "Copied" : "Copy purchase"}
              </button>
            </div>
          ) : (
            <BuyForm
              productName={buying.name}
              price={buying.price}
              cutout={buying.cutout}
              summary={buying.summary}
              details={buying.details}
              onSubmit={(buyer) => {
                const stored = addOrder({
                  spotKey: buyingSpot.key,
                  productId: buying.id,
                  productName: buying.name,
                  total: buying.price,
                  ...buyer,
                });
                if (!stored) return;
                setSaved(stored);
                setCopied(false);
                setPanel("done");
              }}
            />
          )}
        </Sheet>
      )}
    </main>
  );
}

function Cutout({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-lg bg-plaster ${className}`}>
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/30 p-3 md:items-center">
      <div
        role="dialog"
        aria-label={title}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-card border border-line bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl">{title}</h2>
          <button type="button" className="min-h-11 rounded-full border border-line px-4" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BuyForm({
  productName,
  price,
  cutout,
  summary,
  details,
  onSubmit,
}: {
  productName: string;
  price: number;
  cutout: string;
  summary: string;
  details: string[];
  onSubmit: (buyer: { buyerName: string; email: string; phone: string; note: string }) => void;
}) {
  const [buyerName, setBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState("");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!buyerName.trim() || !email.includes("@")) {
          setProblem("Name and a real email are required so Mona can confirm the sale.");
          return;
        }
        setProblem("");
        onSubmit({
          buyerName: buyerName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          note: note.trim(),
        });
      }}
    >
      <Cutout src={cutout} alt={productName} className="h-40 w-full" />
      <p className="text-pretty text-sm text-ink-soft">{summary}</p>
      <ul className="list-disc pl-5 text-sm text-ink-soft">
        {details.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="font-medium tabular-nums">${price} due · the finished piece</p>
      <Field label="Your name" value={buyerName} onChange={setBuyerName} required />
      <Field label="Email" value={email} onChange={setEmail} type="email" required />
      <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
      <label className="text-sm">
        Note for Mona
        <textarea className="mt-1 w-full rounded-xl border border-line bg-plaster px-3 py-3" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {problem && <p className="text-sm text-brass-deep">{problem}</p>}
      <button type="submit" className="min-h-11 rounded-full bg-ink px-4 text-plaster">
        Buy now · ${price}
      </button>
      <p className="text-sm text-ink-soft">This does not charge a card. Mona confirms and collects the full price.</p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      {label}
      <input
        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3"
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Stick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const pad = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function point(e: ReactPointerEvent) {
    const el = pad.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const max = rect.width * 0.34;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / len);
    dx *= scale;
    dy *= scale;
    setKnob({ x: dx, y: dy });
    onChange(dx / max, -dy / max);
  }

  function end() {
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  }

  return (
    <div
      ref={pad}
      className="relative rounded-full border border-line bg-card/90"
      style={{ width: 144, height: 144, touchAction: "none" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        point(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) point(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute rounded-full bg-ink"
        style={{
          width: 56,
          height: 56,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}

function copyOrder(order: Purchase, onDone: () => void) {
  void navigator.clipboard
    .writeText(orderPlainText(order))
    .then(onDone)
    .catch(() => {});
}

function publicShopUrl(): string {
  const baked = String(import.meta.env.VITE_PUBLIC_HOSTNAME ?? "").trim();
  if (/^[a-z0-9.-]+\.grok\.me$/i.test(baked)) return `https://${baked}/`;
  if (typeof window !== "undefined" && window.location.hostname.endsWith(".grok.me")) {
    return `${window.location.origin}/`;
  }
  return "";
}

async function shareShop(setNote: (note: string) => void) {
  const url = publicShopUrl();
  if (!url) {
    setNote("Publish the shop from this chat. That creates the link Mona can open.");
    window.setTimeout(() => setNote(""), 4000);
    return;
  }
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "Mona's Handmade", text: "Walk Mona’s shop.", url });
      return;
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(url);
    setNote("Link copied. Send that to Mona.");
  } catch {
    setNote(url);
  }
  window.setTimeout(() => setNote(""), 4000);
}
