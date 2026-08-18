# create-rango

Scaffold a [`@rangojs/router`](https://www.npmjs.com/package/@rangojs/router)
app — React Server Components with streaming SSR, typed routes, Server
Actions, and Tailwind CSS v4.

```sh
npm create rango@latest my-app
# or
pnpm create rango my-app
```

The scaffolder installs the latest `@rangojs/router` release: it resolves the
registry's `latest` tag at scaffold time and writes that version into the
generated app, falling back to the bundled pin when the registry is
unreachable.

## Templates

Every template is a complete app with production build and deployment
configuration wired. TypeScript throughout; `basic` also has a
plain-JavaScript flavor.

| Template     | Target                                                             |
| ------------ | ------------------------------------------------------------------ |
| `basic`      | Any Node host — `npm run build` + `npm run start` (bundled server) |
| `basic --js` | Same as `basic`, plain JavaScript                                  |
| `cloudflare` | Cloudflare Workers — Cloudflare Vite plugin + `wrangler`           |
| `vercel`     | Vercel — Build Output API v3, `vercel deploy --prebuilt`           |

## Options

```sh
pnpm create rango my-app --template cloudflare        # TypeScript (default)
pnpm create rango my-app --template basic --js        # JavaScript flavor
npm create rango@latest my-app -- --package-manager npm
```

- `-t, --template <name>` — `basic` | `cloudflare` | `vercel`
- `--js` / `--ts` — language flavor (`--js` is `basic`-only)
- `--package-manager <pm>` — `npm` | `pnpm`; interactive runs ask
- `--overwrite` — scaffold into a non-empty directory

## Requirements

Node.js 24 or newer, for both the scaffolder and the generated apps.

## Links

- Router: <https://github.com/rangojs/rango>
- Template sources: <https://github.com/rangojs/templates>

MIT
