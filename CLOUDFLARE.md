# Cloudflare deployment

The storefront runs as a Cloudflare Worker and uses the D1 database
`whatthecraftgifts` through the `DB` binding in `wrangler.jsonc`. The database
ID is already configured there. Its schema has been applied in the Cloudflare
D1 Console.

Wrangler can apply and record the idempotent schema migration:

```sh
npm run db:migrate -- --remote
```

The schema is in `migrations/d1/`. For local development, omit `--remote`.

## One-time Neon data transfer

If existing Neon data should be retained, create the D1 database and apply its
schema first. Then, with the Neon URL set only in your local shell as
`DATABASE_URL` and Wrangler authenticated to Cloudflare, run:

```sh
node scripts/migrate-neon-to-d1.mjs
```

This read-only export copies products, offers, shop name/note/link settings, and
sales into D1. It deliberately omits customer orders and their contact details,
the shop contact email, the desk password hash, and Stripe credentials. It does
not modify or delete anything in Neon. The temporary SQL file is removed after
the import.

The site does not use Neon at runtime. `DATABASE_URL` is only needed temporarily
for this optional transfer; remove it from the Worker after migration.

Stripe remains an external payment processor when checkout is enabled. Add
`STRIPE_SECRET_KEY` as a Cloudflare Worker Secret only when you are ready to
connect Stripe. No Stripe key is needed for the Cloudflare-hosted storefront or
D1 database itself.
