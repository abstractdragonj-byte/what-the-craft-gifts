import { createFileRoute } from "@tanstack/react-router";
import { Desk, DeskGate } from "@/components/boutique/Desk";
import { fetchDesk } from "@/lib/shop.functions";

export const Route = createFileRoute("/admin")({
  loader: () => fetchDesk(),
  component: function Admin() {
    const data = Route.useLoaderData();
    if (data.locked) return <DeskGate />;
    return <Desk initial={data} />;
  },
  pendingComponent: function Opening() {
    return <p className="p-8 text-ink-soft">Opening the desk…</p>;
  },
});
