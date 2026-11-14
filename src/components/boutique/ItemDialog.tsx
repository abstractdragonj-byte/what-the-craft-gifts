import { useState } from "react";
import type { Offer, PublicProduct } from "@/lib/shop.functions";
import { placeOrder } from "@/lib/shop.functions";
import { money } from "@/lib/money";

export function ItemDialog({
  product,
  offers,
  mode,
  onClose,
  onBought,
}: {
  product: PublicProduct;
  offers: Offer[];
  mode: "shelf" | "card";
  onClose: () => void;
  onBought: () => void;
}) {
  const [view, setView] = useState(0);
  const views = [
    { label: "Front", src: product.image },
    { label: "Back", src: product.imageBack },
    { label: "Left", src: product.imageLeft },
    { label: "Right", src: product.imageRight },
  ].filter((item) => item.src);
  const shown = views[view] ?? views[0];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [held, setHeld] = useState(false);

  async function hold() {
    setBusy(true);
    setError("");
    try {
      const result = await placeOrder({
        data: { productId: product.id, buyerName: name, buyerEmail: email, buyerPhone: phone },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setHeld(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That request didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-card bg-card p-4 shadow-lg sm:max-w-lg sm:rounded-card"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={shown?.src}
          alt=""
          className={`w-full bg-plaster object-contain ${mode === "shelf" ? "max-h-96" : "max-h-56"}`}
        />
        {views.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {views.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={`min-h-11 rounded-full border px-4 text-sm ${index === view ? "border-ink bg-ink text-plaster" : "border-line"}`}
                onClick={() => setView(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
        {mode === "shelf" && <p className="mt-2 text-sm text-brass">Off the shelf</p>}
        <h2 id="item-title" className="mt-1 font-display text-3xl leading-tight">
          {product.name}
        </h2>
        <p className="mt-2 text-ink-soft">{product.description || product.summary}</p>
        <p className="mt-3 text-xl">{money(product.priceCents)}</p>
        {held ? (
          <p className="mt-4">Mona has your request. The piece stays on the shelf until she takes payment and marks it paid.</p>
        ) : product.stripeLink ? (
          <>
            <p className="mt-3 text-sm text-ink-soft">Pay by card on the next page. It has the piece name and the shop logo.</p>
            <a href={product.stripeLink} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-sage px-4 text-on-sage">
              Pay now · {money(product.priceCents)}
            </a>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-soft">Card checkout turns on when Stripe is connected. Until then, ask Mona to hold it and she’ll take payment.</p>
            <label className="mt-3 block text-sm">
              Your name
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm">
              Email
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="mt-3 block text-sm">
              Phone, if you want a text
              <input className="mt-1 min-h-11 w-full rounded-xl border border-line bg-plaster px-3" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            {error && <p className="mt-2 text-sm text-brass-deep">{error}</p>}
            <button type="button" className="mt-4 min-h-11 w-full rounded-full bg-sage px-4 text-on-sage disabled:opacity-40" disabled={busy} onClick={() => void hold()}>
              {busy ? "Sending…" : `Ask Mona to hold it · ${money(product.priceCents)}`}
            </button>
          </>
        )}
        <button type="button" className="mt-3 min-h-11 w-full rounded-full border border-line px-4" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  );
}
