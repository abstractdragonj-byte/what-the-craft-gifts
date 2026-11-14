import { createFileRoute, Link } from "@tanstack/react-router";
import { DeskGate } from "@/components/boutique/Desk";
import { fetchDesk } from "@/lib/shop.functions";
import { money } from "@/lib/money";

export const Route = createFileRoute("/inventory")({
  loader: () => fetchDesk(),
  component: function InventoryPage() {
    const data = Route.useLoaderData();
    if (data.locked) return <DeskGate />;
    const available = data.products.filter((product) => !product.sold);
    const sold = data.products.filter((product) => product.sold);
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm">
            Back to the desk
          </Link>
          <button type="button" className="min-h-11 rounded-full bg-sage px-4 text-on-sage" onClick={() => window.print()}>
            Print
          </button>
        </div>
        <h1 className="font-display text-4xl">{data.settings.shopName}</h1>
        <p className="mt-1 text-ink-soft">
          {available.length} on the shelf · {sold.length} sold
        </p>
        <table className="mt-6 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink">
              <th className="py-2 pr-3 font-medium">Piece</th>
              <th className="py-2 pr-3 font-medium">Kind</th>
              <th className="py-2 pr-3 font-medium">Price</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((product) => (
              <tr key={product.id} className="border-b border-line align-top">
                <td className="py-3 pr-3">
                  <span className="block font-medium">{product.name}</span>
                  {product.summary && <span className="text-ink-soft">{product.summary}</span>}
                </td>
                <td className="py-3 pr-3">{product.category}</td>
                <td className="py-3 pr-3">{money(product.priceCents)}</td>
                <td className="py-3">{product.sold ? "Sold" : "On the shelf"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    );
  },
});
