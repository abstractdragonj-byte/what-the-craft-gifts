import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopTag } from "@/components/boutique/ShopTag";
import { fetchShop } from "@/lib/shop.functions";

export const Route = createFileRoute("/tag")({
  loader: () => fetchShop(),
  component: function TagPage() {
    const data = Route.useLoaderData();
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="no-print mb-6 flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl">Price tag</h1>
          <Link to="/admin" className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm">
            Shop desk
          </Link>
        </div>
        <ShopTag shopName={data.settings.shopName} />
      </main>
    );
  },
});
