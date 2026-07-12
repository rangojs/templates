# Rango templates

Starter templates for [`@rangojs/router`](https://www.npmjs.com/package/@rangojs/router) apps, plus the `create-rango` scaffolder.

## Usage

```sh
npm create rango@latest my-app
# or
pnpm create rango my-app
```

Non-interactive:

```sh
pnpm create rango my-app --template cloudflare        # TypeScript (default)
pnpm create rango my-app --template basic --js        # JavaScript flavor
npm create rango@latest my-app -- --package-manager npm
```

Interactive runs ask whether generated commands should use npm or pnpm. Pass
`--package-manager npm|pnpm` to make that choice non-interactively.

## Templates

Every template is a complete app: React Server Components with streaming SSR, typed routes, server actions, and Tailwind CSS v4. TypeScript throughout; `basic` also has a plain-JavaScript flavor (`basic-js`).

| Template     | Target                                                             |
| ------------ | ------------------------------------------------------------------ |
| `basic`      | Any Node host — `npm run build` + `npm run start` (bundled server) |
| `basic-js`   | Same as `basic`, plain JavaScript                                  |
| `cloudflare` | Cloudflare Workers — Cloudflare Vite plugin + `wrangler`           |
| `vercel`     | Vercel — Build Output API v3, `vercel deploy --prebuilt`           |

## Repo layout

- `templates/<name>` — the template sources. They are pnpm workspace packages so CI installs, typechecks, and builds every one against the published `@rangojs/router`.
- `packages/create-rango` — the scaffolder. `prepack` syncs `templates/` into the package so the published tarball is self-contained.

## Development

```sh
pnpm install
pnpm run generate    # refresh committed route maps
pnpm run typecheck   # tsc across TS templates
pnpm run lint        # oxlint across the repository
pnpm run format      # oxfmt check
pnpm run build       # vite build across all templates
pnpm run test        # template unit tests + create-rango package tests
pnpm run test:runtime # every template in dev and production
pnpm run check       # complete local/CI quality gate

# Run the scaffolder from the repo (uses ../../templates directly):
node packages/create-rango/index.js /tmp/my-app --template basic
```

`test:smoke` exercises the source layout; `test:pack` packs the tarball, installs it into a standalone npm project, scaffolds every template from the installed bin, builds each scaffold, and asserts the vercel function runtime (`nodejs24.x`) plus the basic template's production server.

Template rules:

- Dependencies use real published versions — never `workspace:*` or `catalog:` (the smoke test guards `@rangojs/router`).
- Ship `_gitignore`, not `.gitignore` (npm strips `.gitignore` from tarballs); create-rango renames it on scaffold.
- Keep `src/router.named-routes.gen.ts` committed and in sync with the routes.
- Keep each `src/router.gen.ts` local route map committed too; `npm run generate` refreshes both generated surfaces.

## Publishing create-rango

The first package version is published manually because npm requires the package
to exist before a trusted publisher can be configured. After that, configure
`rangojs/templates` and `.github/workflows/publish.yml` as the package's trusted
publisher. Subsequent GitHub releases publish with provenance.

`prepublishOnly` reruns the package tests for local/manual publishing, while
`prepack` syncs the templates into the tarball and `postpack` removes the local
snapshot.
