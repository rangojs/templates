// In-memory state for demo purposes: it resets on restart and is per-instance.
// Use a database or KV store in a real app.
let count = 0;

export function getCount(): number {
  return count;
}

export function updateCount(delta: number): void {
  count += delta;
}
