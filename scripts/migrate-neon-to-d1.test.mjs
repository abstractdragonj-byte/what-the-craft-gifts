import assert from "node:assert/strict";
import test from "node:test";
import { buildImportSql, sqlLiteral } from "./migrate-neon-to-d1.mjs";

test("SQL literals escape quotes and preserve booleans and timestamps", () => {
  assert.equal(sqlLiteral("Mona's shop"), "'Mona''s shop'");
  assert.equal(sqlLiteral(true), "1");
  assert.equal(sqlLiteral(false), "0");
  assert.equal(sqlLiteral(new Date("2026-01-02T03:04:05.000Z")), "'2026-01-02T03:04:05.000Z'");
});

test("the data transfer excludes customer orders and credential fields", () => {
  const sql = buildImportSql({
    settings: {
      id: "main",
      shop_name: "What the Craft Gifts",
      week_note: "New pieces this week",
      stripe_url: "https://dashboard.stripe.com/",
      contact_email: "not-exported@example.test",
      desk_hash: "not-exported-hash",
      stripe_key: "not-exported-key",
    },
    products: [{ id: "fox", name: "Cinnamon Fox", stripe_key: "not-exported-key" }],
    offers: [{ id: "show10", code: "SHOW10", active: true }],
    sales: [
      { id: "sale-1", product_name: "Cinnamon Fox", buyer_email: "not-exported@example.test" },
    ],
  });

  assert.match(sql, /INSERT INTO products/);
  assert.match(sql, /INSERT INTO offers/);
  assert.match(sql, /INSERT INTO sales/);
  assert.match(sql, /INSERT INTO shop_settings/);
  assert.doesNotMatch(sql, /not-exported|buyer_email|desk_hash|stripe_key|contact_email|orders/i);
});
