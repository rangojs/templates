import { Meta, type HandlerContext } from "@rangojs/router";
import { Counter } from "../Counter.js";
import { getCount } from "../../data/counter.js";

export function CounterPage(ctx: HandlerContext) {
  const meta = ctx.use(Meta);
  meta({ title: "Counter — Rango" });
  meta({
    name: "description",
    content: "A progressively enhanced React server action counter",
  });

  const initialCount = getCount();

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Counter</h1>
      <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
        The count lives on the server. The form works before JavaScript loads,
        then React adds pending feedback without changing the action.
      </p>
      <div className="mt-8">
        <Counter initialCount={initialCount} />
      </div>
    </main>
  );
}
