import { Meta } from "@rangojs/router";

export function GreetingPage(ctx) {
  const name = ctx.params.name;

  const meta = ctx.use(Meta);
  meta({ title: `Hello ${name} — Rango` });
  meta({
    name: "description",
    content: `A typed dynamic route greeting ${name}`,
  });

  return (
    <main>
      <h1 className="break-words text-3xl font-semibold tracking-tight">
        Hello, {name}!
      </h1>
      <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
        This page matched <code>/hello/:name</code> and read the param from{" "}
        <code>ctx.params</code> on the server.
      </p>
    </main>
  );
}
