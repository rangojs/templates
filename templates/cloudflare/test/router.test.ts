import { assertGeneratedRoutesMatch } from "@rangojs/router/testing";
import { test } from "vitest";
import { NamedRoutes } from "../src/router.named-routes.gen.js";
import { router } from "../src/router.js";

test("generated routes match the runtime router", async () => {
  await assertGeneratedRoutesMatch(router, NamedRoutes);
});
