import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { rango } from "@rangojs/router/vite";

// The vercel preset builds like the node preset (Vercel runs Node Functions),
// folds NODE_ENV for the SSR/RSC build, and assembles .vercel/output
// (Build Output API v3) from dist/ after `vite build`.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // runtime: the preset default is still nodejs22.x; this app targets
    // Node 24 (see package.json engines), so pin the function runtime to match.
    rango({ preset: "vercel", vercel: { runtime: "nodejs24.x" } }),
  ],
});
