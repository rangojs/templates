"use client";

import { useFormStatus } from "react-dom";
import { updateCount } from "../actions/counter.js";

export function Counter({ initialCount }: { initialCount: number }) {
  return (
    <form action={updateCount}>
      <CounterControls count={initialCount} />
    </form>
  );
}

function CounterControls({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-4" aria-busy={pending}>
      <button
        type="submit"
        name="delta"
        value="-1"
        disabled={pending}
        aria-label="Decrease count"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-blue-400"
      >
        −1
      </button>
      <output
        aria-live="polite"
        className="min-w-16 text-center text-2xl font-semibold tabular-nums"
        style={{ opacity: pending ? 0.5 : 1 }}
      >
        {count}
      </output>
      <button
        type="submit"
        name="delta"
        value="1"
        disabled={pending}
        aria-label="Increase count"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-blue-400"
      >
        +1
      </button>
      <span className="sr-only" role="status">
        {pending ? "Updating count" : ""}
      </span>
    </div>
  );
}
