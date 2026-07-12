"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  Link,
  MetaTags,
  useNavigation,
  usePathname,
  useReverse,
} from "@rangojs/router/client";
import { routes } from "../router.gen.js";
import styles from "../styles.css?url";

export function Document({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reverse = useReverse(routes);
  const isNavigating = useNavigation(
    (navigation) => navigation.state !== "idle",
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      contentRef.current?.focus();
      previousPathname.current = pathname;
    }
  }, [pathname]);

  const links = [
    [reverse("home"), "Home"],
    [reverse("about"), "About"],
    [reverse("counter"), "Counter"],
  ] as const;

  return (
    <html lang="en">
      <head>
        <MetaTags />
        <link rel="preload" as="style" href={styles} precedence="default" />
        <link rel="stylesheet" href={styles} precedence="default" />
      </head>
      <body className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <a
            href="#main-content"
            className="sr-only rounded bg-white px-3 py-2 text-zinc-950 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10"
          >
            Skip to content
          </a>
          <nav className="mb-10 flex items-center gap-6 border-b border-zinc-200 pb-4 text-sm font-medium dark:border-zinc-800">
            {links.map(([to, label]) => (
              <Link
                key={to}
                to={to}
                aria-current={pathname === to ? "page" : undefined}
                className="hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:hover:text-blue-400 dark:focus-visible:outline-blue-400"
              >
                {label}
              </Link>
            ))}
          </nav>
          <span className="sr-only" aria-live="polite">
            {isNavigating ? "Loading page" : ""}
          </span>
          <div
            id="main-content"
            ref={contentRef}
            tabIndex={-1}
            className="outline-none"
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
