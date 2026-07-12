"use server";

import { updateCount as persistCount } from "../data/counter.js";

export async function updateCount(formData) {
  const delta = formData.get("delta");
  if (delta !== "-1" && delta !== "1") {
    throw new Error("Invalid counter change");
  }
  persistCount(Number(delta));
}
