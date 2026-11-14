export type Product = {
  id: string;
  name: string;
  price: number;
  size: string;
  cutout: string;
  summary: string;
  details: string[];
};

export type DisplaySpot = {
  key: string;
  productId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  height: number;
};

export const products: Product[] = [
  {
    id: "graduation",
    name: "Graduation Bear",
    price: 40,
    size: "19 in tall · 10 in wide",
    cutout: "/crafts/graduation.png",
    summary: "A finished graduation bear with a diploma, ready to take home.",
    details: [
      "Already made. What you see on the shelf is the piece you buy.",
      "19 inches tall and 10 inches wide.",
      "Handmade by Mona.",
    ],
  },
  {
    id: "nurse",
    name: "Nurse Bear",
    price: 40,
    size: "19 in tall · 10 in wide",
    cutout: "/crafts/nurse.png",
    summary: "A finished nurse bear, cap and all, ready to take home.",
    details: [
      "Already made. What you see on the shelf is the piece you buy.",
      "19 inches tall and 10 inches wide.",
      "Handmade by Mona.",
    ],
  },
  {
    id: "doctor",
    name: "Doctor Bear",
    price: 40,
    size: "19 in tall · 10 in wide",
    cutout: "/crafts/doctor.png",
    summary: "A finished doctor bear with a mask and stethoscope.",
    details: [
      "Already made. What you see on the shelf is the piece you buy.",
      "19 inches tall and 10 inches wide.",
      "Handmade by Mona.",
    ],
  },
];

export const spots: DisplaySpot[] = [
  { key: "grad-island", productId: "graduation", x: 0, y: 0.8, z: 0.02, rotY: 0.15, height: 0.82 },
  { key: "grad-left", productId: "graduation", x: -3.95, y: 1.02, z: -2.15, rotY: Math.PI / 2, height: 0.72 },
  { key: "grad-front", productId: "graduation", x: -2.45, y: 0.745, z: 2.55, rotY: 0.35, height: 0.7 },
  { key: "nurse-right", productId: "nurse", x: 3.95, y: 1.02, z: -2.15, rotY: -Math.PI / 2, height: 0.72 },
  { key: "nurse-back", productId: "nurse", x: -2.7, y: 1.025, z: -5.02, rotY: 0, height: 0.68 },
  { key: "nurse-front", productId: "nurse", x: 2.45, y: 0.745, z: 2.55, rotY: -0.25, height: 0.7 },
  { key: "doctor-back", productId: "doctor", x: 0.02, y: 1.02, z: -5.02, rotY: 0, height: 0.72 },
  { key: "doctor-side", productId: "doctor", x: 2.7, y: 1.025, z: -5.02, rotY: 0, height: 0.68 },
  { key: "doctor-stand", productId: "doctor", x: 3.05, y: 0.745, z: 0.35, rotY: -0.5, height: 0.7 },
];

export function productById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function spotByKey(key: string): DisplaySpot | undefined {
  return spots.find((s) => s.key === key);
}

export function spotsFor(productId: string): DisplaySpot[] {
  return spots.filter((s) => s.productId === productId);
}
