import { assertGeneratedRoutesMatch } from "@rangojs/router/testing";
import { test } from "vitest";
import { NamedRoutes } from "../src/router.named-routes.gen.ts";
import { router } from "../src/router.jsx";

test("generated routes match the runtime router", async () => {
  await assertGeneratedRoutesMatch(router, NamedRoutes);
});
