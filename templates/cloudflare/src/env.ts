/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers bindings. Add entries here as you bind resources in
// wrangler.json, e.g.:
//   KV: KVNamespace;
//   DB: D1Database;
export interface AppBindings {}

declare global {
  namespace Rango {
    interface Env extends AppBindings {}
  }
}
