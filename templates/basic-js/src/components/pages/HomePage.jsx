import { Meta } from "@rangojs/router";
import { Link } from "@rangojs/router/client";

export function HomePage(ctx) {
  const meta = ctx.use(Meta);
  meta({ title: "Home — Rango" });
  meta({
    name: "description",
    content: "A React Server Components app powered by @rangojs/router",
  });

  const greetingUrl = ctx.reverse("greeting", { name: "world" });
  const counterUrl = ctx.reverse("counter");

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to Rango
      </h1>
      <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
        This starter renders React Server Components with streaming SSR, typed
        routes, and Tailwind CSS. Handlers run on the server; client components
        hydrate where you opt in with <code>"use client"</code>.
      </p>
      <ul className="mt-8 space-y-3">
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <Link
            to={greetingUrl}
            className="font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:text-blue-400 dark:focus-visible:outline-blue-400"
          >
            Dynamic route
          </Link>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <code>/hello/:name</code> — read path params from the handler
            context.
          </p>
        </li>
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <Link
            to={counterUrl}
            className="font-medium text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:text-blue-400 dark:focus-visible:outline-blue-400"
          >
            Server actions
          </Link>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            A client component calling <code>"use server"</code> functions.
          </p>
        </li>
      </ul>
    </main>
  );
}
