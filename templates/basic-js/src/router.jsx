import { createRouter, urls } from "@rangojs/router";
import { updateCount } from "./actions/counter.js";
import { Document } from "./components/Document.jsx";
import { ErrorFallback, NotFoundPage } from "./components/Fallbacks.jsx";
import { HomePage } from "./components/pages/HomePage.jsx";
import { AboutPage } from "./components/pages/AboutPage.jsx";
import { GreetingPage } from "./components/pages/GreetingPage.jsx";
import { CounterPage } from "./components/pages/CounterPage.jsx";

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
