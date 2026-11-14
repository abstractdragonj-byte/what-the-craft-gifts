import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Purchase = {
  id: string;
  createdAt: string;
  spotKey: string;
  productId: string;
  productName: string;
  buyerName: string;
  email: string;
  phone: string;
  note: string;
  total: number;
};

type OrdersState = {
  orders: Purchase[];
  soldSpotKeys: string[];
  add: (order: Omit<Purchase, "id" | "createdAt">) => Purchase | null;
  remove: (id: string) => void;
};

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      soldSpotKeys: [],
      add: (order) => {
        if (get().soldSpotKeys.includes(order.spotKey)) return null;
        const saved: Purchase = {
          ...order,
          id: `MH-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          orders: [saved, ...state.orders],
          soldSpotKeys: [...state.soldSpotKeys, order.spotKey],
        }));
        return saved;
      },
      remove: (id) =>
        set((state) => {
          const order = state.orders.find((item) => item.id === id);
          return {
            orders: state.orders.filter((item) => item.id !== id),
            soldSpotKeys: order ? state.soldSpotKeys.filter((key) => key !== order.spotKey) : state.soldSpotKeys,
          };
        }),
    }),
    { name: "monas-handmade-orders-v2", skipHydration: true },
  ),
);

export function orderPlainText(order: Purchase): string {
  return [
    `Mona's Handmade`,
    `Purchase ${order.id}`,
    order.productName,
    `$${order.total} · finished piece, ready now`,
    `Buyer: ${order.buyerName}`,
    `Email: ${order.email}`,
    order.phone ? `Phone: ${order.phone}` : "",
    order.note ? `Note: ${order.note}` : "",
    `Nothing was charged in the app. Mona confirms and collects.`,
  ]
    .filter(Boolean)
    .join("\n");
}
