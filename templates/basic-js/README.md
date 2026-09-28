# Rango app

A [React Server Components](https://react.dev/reference/rsc/server-components) app powered by [`@rangojs/router`](https://www.npmjs.com/package/@rangojs/router), Vite, and Tailwind CSS — plain JavaScript, no TypeScript.

## Commands

```sh
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run start    # run the production server (server.mjs)
npm run preview  # serve the production build locally (Vite preview, local-only)
npm run generate # regenerate committed route maps
npm test         # run unit tests
npm run lint     # oxlint
npm run format   # oxfmt check
npm run check    # tests + lint + format
```

Requires Node.js 24 or newer.

## Deploying

`npm run build && npm run start` is the production path: `server.mjs` serves fingerprinted assets with immutable cache headers, keeps public files revalidatable, and streams everything else through the router's fetch handler. Set `PORT` to change the port. `vite preview` is a local convenience, not a production server.

## Project layout

- `server.mjs` — the production server (`npm run start`): static assets via sirv, everything else via the router.
- `src/router.jsx` — the router: URL patterns, route names, and the document component. The Vite plugin auto-discovers it; there is no `index.html` or entry file.
- `src/components/Document.jsx` — the HTML shell (client component). It renders the router's document components: `Html.Meta` (tags from the `Meta` handle), `Html.Scripts` in `<head>` and `<body>` (scripts from the `Script` handle), and `Html.ScrollRestoration` (scroll position on back/forward). Tailwind is wired here via `styles.css?url`.
- `src/components/pages/` — route handlers. Each is a server function receiving the handler context (params, meta, headers, …).
- `src/actions/` — `"use server"` functions callable from client components.
- `test/router.test.js` — route-map drift test using `@rangojs/router/testing`.
- `src/router.named-routes.gen.ts` — generated global route names used by `ctx.reverse()` and editor path checks; commit it.
- `src/router.gen.ts` — generated local route map used by `useReverse()` in client components; run `npm run generate` after route changes and commit it.

## Why is `typescript` in devDependencies?

Your app code is plain JavaScript. The router's route-name generator uses the TypeScript compiler API to parse your routes and write `src/router.named-routes.gen.ts`, so the `typescript` package must be installed — no `tsconfig.json`, no type checking.
