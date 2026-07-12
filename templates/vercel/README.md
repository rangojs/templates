# Rango app on Vercel

A [React Server Components](https://react.dev/reference/rsc/server-components) app powered by [`@rangojs/router`](https://www.npmjs.com/package/@rangojs/router), deployed to Vercel with Vite and Tailwind CSS.

## Commands

```sh
npm run dev        # start the dev server
npm run build      # vite build, then assembles .vercel/output (Build Output API v3)
npm run preview    # serve .vercel/output with filesystem/function routing
npm run generate   # regenerate committed route maps
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run format     # oxfmt check
npm run check      # typecheck + lint + format
```

Requires Node.js 24 or newer.

## Deploying

The `vercel` preset assembles `.vercel/output/` during `npm run build`, so deploy prebuilt:

```sh
npm run build
npx vercel@latest deploy --prebuilt          # preview deployment
npx vercel@latest deploy --prebuilt --prod   # production
```

Pushing the repo to Vercel with the default Vite framework settings also works: the build output is picked up from `.vercel/output`.

## Project layout

- `src/router.tsx` — the router: URL patterns, route names, and the document component. The Vite plugin auto-discovers it; there is no `index.html` or entry file.
- `src/components/Document.tsx` — the HTML shell (client component). Tailwind is wired here via `styles.css?url`.
- `src/components/pages/` — route handlers (server functions receiving a `HandlerContext`).
- `src/actions/` — `"use server"` functions callable from client components.
- `src/router.named-routes.gen.ts` — generated global route names for `Handler<"name">` and `ctx.reverse()`; commit it.
- `src/router.gen.ts` — generated local route map used by `useReverse()` in client components; run `npm run generate` after route changes and commit it.
- `scripts/preview.mjs` — serves the assembled Vercel output locally, including the streaming function.

## Why is `esbuild` in devDependencies?

The vercel preset bundles the generated function launcher with esbuild at build time. Vite 8 no longer ships esbuild (it is rolldown-based), so the app must provide it.

## Note on the counter demo

The demo count lives in function instance memory, so it resets across invocations/instances. Use a database or Vercel KV-style store for real persistence.
