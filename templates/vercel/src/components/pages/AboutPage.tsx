import { Meta, type HandlerContext } from "@rangojs/router";

export function AboutPage(ctx: HandlerContext) {
  const meta = ctx.use(Meta);
  meta({ title: "About — Rango" });
  meta({
    name: "description",
    content: "How this Rango starter structures routes and server components",
  });

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
        Routes are plain functions receiving a handler context. Register them in{" "}
        <code>src/router.tsx</code> with Django-style URL patterns; route names
        generate typed <code>href()</code> lookups as you save.
      </p>
    </main>
  );
}
