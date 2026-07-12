import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { rango } from "@rangojs/router/vite";

// The rango plugin auto-discovers the router (the single createRouter call in
// src/router.jsx) and provides the client/server entries, so no index.html or
// entry files are needed.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss(), rango()],
  // Fold NODE_ENV at build time so React's dev/prod branches collapse and the
  // production bundle does not ship react development chunks.
  define:
    command === "build"
      ? { "process.env.NODE_ENV": JSON.stringify("production") }
      : undefined,
}));
