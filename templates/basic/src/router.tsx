import { createRouter, urls } from "@rangojs/router";
import { updateCount } from "./actions/counter.js";
import { Document } from "./components/Document.js";
import { ErrorFallback, NotFoundPage } from "./components/Fallbacks.js";
import { HomePage } from "./components/pages/HomePage.js";
import { AboutPage } from "./components/pages/AboutPage.js";
import { GreetingPage } from "./components/pages/GreetingPage.js";
import { CounterPage } from "./components/pages/CounterPage.js";

export const urlpatterns = urls(({ path, revalidate }) => [
  path("/", HomePage, { name: "home" }),
  path("/about", AboutPage, { name: "about" }),
  path("/hello/:name", GreetingPage, { name: "greeting" }),
  path("/counter", CounterPage, { name: "counter" }, () => [
    revalidate((ctx) => ctx.isAction(updateCount) || undefined),
  ]),
]);

export const router = createRouter({
  document: Document,
  urls: urlpatterns,
  defaultErrorBoundary: ErrorFallback,
  defaultNotFoundBoundary: NotFoundPage,
  notFound: NotFoundPage,
});

type AppRoutes = typeof router.routeMap;

declare global {
  namespace Rango {
    interface RegisteredRoutes extends AppRoutes {}
  }
}
