/// <reference types="@cloudflare/workers-types" />
import { router } from "./router.js";
import type { AppBindings } from "./env.js";

export default {
  async fetch(request, env, ctx) {
    return router.fetch(request, { env, ctx });
  },
} satisfies ExportedHandler<AppBindings>;
