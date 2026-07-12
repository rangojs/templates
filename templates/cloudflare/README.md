# Rango app on Cloudflare Workers

A [React Server Components](https://react.dev/reference/rsc/server-components) app powered by [`@rangojs/router`](https://www.npmjs.com/package/@rangojs/router), running on Cloudflare Workers with Vite and Tailwind CSS.

## Commands

```sh
npm run dev        # Vite dev server (Workers runtime via the Cloudflare plugin)
npm run build      # production build to dist/
npm run preview    # serve the production build locally in workerd
npm run deploy     # build and deploy the generated Worker config
npm run generate   # regenerate committed route maps
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run format     # oxfmt check
npm run check      # typecheck + lint + format
```

Requires Node.js 24 or newer.

## Project layout

- `src/worker.rsc.tsx` — the Worker entry (`wrangler.json#main`); forwards requests to the router.
- `src/router.tsx` — the router: URL patterns, route names, and the document component.
- `src/env.ts` — typed Workers bindings. Add KV/D1/R2 bindings in `wrangler.json`, then mirror them in `AppBindings` and read them via the request context.
- `src/components/Document.tsx` — the HTML shell (client component). Tailwind is wired here via `styles.css?url`.
- `src/components/pages/` — route handlers (server functions receiving a `HandlerContext`).
- `src/actions/` — `"use server"` functions callable from client components.
- `src/router.named-routes.gen.ts` — generated global route names for `Handler<"name">` and `ctx.reverse()`; commit it.
- `src/router.gen.ts` — generated local route map used by `useReverse()` in client components; run `npm run generate` after route changes and commit it.

The deploy script uses `dist/rsc/wrangler.json`, which points Wrangler at the
bundled Worker emitted by Vite. Keep the source `wrangler.json` as the input to
the Cloudflare Vite plugin.

## Note on the counter demo

The demo count lives in Worker instance memory, so it resets between isolates. Bind KV or D1 for real persistence.
