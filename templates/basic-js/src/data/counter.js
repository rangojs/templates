// In-memory state for demo purposes: it resets on restart and is per-instance.
// Use a database or KV store in a real app.
let count = 0;

export function getCount() {
  return count;
}

export function updateCount(delta) {
  count += delta;
}
