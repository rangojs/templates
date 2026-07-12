import { Link, href } from "@rangojs/router/client";

const linkClass =
  "mt-6 inline-flex font-medium text-blue-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:text-blue-400 dark:focus-visible:outline-blue-400";

export function ErrorFallback() {
  return (
    <main>
      <div role="alert">
        <h1 className="text-3xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
          The page could not be rendered. Try again or return home.
        </p>
      </div>
      <Link to={href("/")} className={linkClass}>
        Return home
      </Link>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
        The page you requested does not exist.
      </p>
      <Link to={href("/")} className={linkClass}>
        Return home
      </Link>
    </main>
  );
}
