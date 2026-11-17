#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;
const databaseName = process.argv[2] || "whatthecraftgifts";

const productColumns = [
  "id",
  "name",
  "summary",
  "description",
  "price_cents",
  "cost_cents",
  "category",
  "image",
  "image_back",
  "image_left",
  "image_right",
  "stripe_product_id",
  "stripe_price_id",
  "stripe_link_id",
  "stripe_link",
  "stripe_amount",
  "featured",
  "feature_order",
  "list_order",
  "sold",
  "listed_at",
  "sold_at",
];
const offerColumns = ["id", "code", "label", "percent", "active"];
const saleColumns = [
  "id",
  "product_id",
  "product_name",
  "qty",
  "amount_cents",
  "cost_cents",
  "offer_code",
  "channel",
  "sold_at",
];

export function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Cannot migrate a non-finite number.");
    return String(value);
  }
  if (typeof value !== "string") {
    throw new TypeError(`Cannot migrate a value of type ${typeof value}.`);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function insertStatements(table, columns, rows) {
  return rows.map((row) => {
    const values = columns.map((column) => sqlLiteral(row[column])).join(", ");
    const updates = columns
      .filter((column) => column !== "id")
      .map((column) => `${column} = excluded.${column}`)
      .join(", ");
    return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values}) ON CONFLICT (id) DO UPDATE SET ${updates};`;
  });
}

export function buildImportSql({ settings, products, offers, sales }) {
  const statements = [
    ...insertStatements("products", productColumns, products),
    ...insertStatements("offers", offerColumns, offers),
    ...insertStatements("sales", saleColumns, sales),
  ];
  if (settings) {
    statements.push(
      `INSERT INTO shop_settings (id, shop_name, week_note, stripe_url) VALUES (${[
        "id",
        "shop_name",
        "week_note",
        "stripe_url",
      ]
        .map((column) => sqlLiteral(settings[column]))
        .join(
          ", ",
        )}) ON CONFLICT (id) DO UPDATE SET shop_name = excluded.shop_name, week_note = excluded.week_note, stripe_url = excluded.stripe_url;`,
    );
  }
  return `${statements.join("\n")}\n`;
}

async function main() {
  if (!databaseUrl) {
    throw new Error(
      "Set DATABASE_URL in your local environment for the one-time read-only export.",
    );
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  let settings;
  let products;
  let offers;
  let sales;
  try {
    const [settingsResult, productsResult, offersResult, salesResult] = await Promise.all([
      pool.query(
        "SELECT id, shop_name, week_note, stripe_url FROM shop_settings WHERE id = 'main'",
      ),
      pool.query(`SELECT ${productColumns.join(", ")} FROM products`),
      pool.query(`SELECT ${offerColumns.join(", ")} FROM offers`),
      pool.query(`SELECT ${saleColumns.join(", ")} FROM sales`),
    ]);
    settings = settingsResult.rows[0];
    products = productsResult.rows;
    offers = offersResult.rows;
    sales = salesResult.rows;
  } finally {
    await pool.end();
  }

  const directory = await mkdtemp(join(tmpdir(), "what-the-craft-d1-"));
  const sqlPath = join(directory, "import.sql");
  try {
    await writeFile(sqlPath, buildImportSql({ settings, products, offers, sales }), {
      encoding: "utf8",
      mode: 0o600,
    });
    execFileSync(
      join(root, "node_modules", ".bin", "wrangler"),
      ["d1", "execute", databaseName, "--remote", "--file", sqlPath],
      { cwd: root, stdio: "inherit" },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  console.log(
    `Imported ${products.length} products, ${offers.length} offers, and ${sales.length} sales. Buyer orders and credential fields were not copied.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    console.error(
      "[d1 import] Failed. No Neon records were modified.",
      code ? `Error code: ${code}` : "",
    );
    process.exitCode = 1;
  });
}
