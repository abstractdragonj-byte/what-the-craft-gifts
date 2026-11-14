import type { PublicProduct } from "@/lib/shop.functions";
import { money } from "@/lib/money";

export function FeaturedShelf({
  products,
  heldId,
  onPick,
}: {
  products: PublicProduct[];
  heldId: string | null;
  onPick: (id: string) => void;
}) {
  if (products.length === 0) {
    return <div className="rounded-card border border-line bg-card px-4 py-16 text-center text-ink-soft">Nothing on the feature shelf this week.</div>;
  }
  return (
    <div className="overflow-hidden rounded-card border border-line bg-card">
      <ul className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 sm:p-4">
        {products.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              className={`w-full overflow-hidden rounded-xl bg-plaster text-center ${heldId === product.id ? "ring-2 ring-brass" : ""}`}
              onClick={() => onPick(product.id)}
            >
              <img src={product.image} alt={product.name} className="aspect-square w-full object-contain" />
              <span className="block px-3 pb-3">
                <span className="block font-display text-lg leading-tight">{product.name}</span>
                <span className="text-ink-soft">{money(product.priceCents)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <img src="/shelf.jpg" alt="" className="h-16 w-full object-cover object-bottom sm:h-20" />
    </div>
  );
}
