# Cloudflare deployment

The storefront runs as a Cloudflare Worker. Build with `npm run build` and
deploy with `npm run deploy`; the Worker name and entry point are in
`wrangler.jsonc`.

The Worker requires a `DATABASE_URL` secret. In the Cloudflare dashboard, open
the `whatthecraftgifts` Worker, go to **Settings → Variables and Secrets**, and
add `DATABASE_URL` as a secret using the existing Neon connection string. Never
put the value in Git, a plain-text Worker variable, or chat. It must point to the
Neon database where the shop migrations have already been applied.

The Cloudflare build does not run database migrations. That keeps deploys from
changing the database as a side effect. The app uses Neon's serverless HTTP
driver, so no Hyperdrive resource or separate database service is required.

Add `STRIPE_SECRET_KEY` as a Worker secret only when enabling Stripe checkout.
