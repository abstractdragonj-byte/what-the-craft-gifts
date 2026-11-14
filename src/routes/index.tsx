import { createFileRoute } from "@tanstack/react-router";
import { ShopPage } from "@/components/boutique/ShopPage";
import { fetchShop } from "@/lib/shop.functions";

export const Route = createFileRoute("/")({
  loader: () => fetchShop(),
  component: function Home() {
    const data = Route.useLoaderData();
    return <ShopPage data={data} />;
  },
  pendingComponent: function Opening() {
    return <p className="p-8 text-ink-soft">Opening the shop…</p>;
  },
});
