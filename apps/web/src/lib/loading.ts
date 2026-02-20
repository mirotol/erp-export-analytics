/**
 * withSmartLoading prevents loading spinner "flicker" for very fast requests.
 *
 * Pattern:
 * - Wait `delayMs` before showing loading.
 * - If loading is shown, keep it visible at least `minMs`.
 *
 * Note: this helper does NOT set loading state itself; it just delays completion
 * so the caller can keep loading visible long enough when they choose to show it.
 */
export async function withSmartLoading<T>(
  promise: Promise<T>,
  opts?: { delayMs?: number; minMs?: number }
): Promise<T> {
  const delayMs = opts?.delayMs ?? 150; // don't show spinner before this
  const minMs = opts?.minMs ?? 300; // once shown, keep at least this long

  const start = performance.now();

  let timerId: number | undefined;
  const delay = new Promise<void>((resolve) => {
    timerId = window.setTimeout(resolve, delayMs);
  });

  const result = await Promise.race([
    promise.then((v) => ({ type: "done" as const, v })),
    delay.then(() => ({ type: "delay" as const })),
  ]);

  // If work finished before delay, prevent the delayed timer from firing later.
  if (result.type === "done") {
    if (timerId !== undefined) window.clearTimeout(timerId);
    return result.v;
  }

  // Delay elapsed -> caller would show spinner around now.
  // Wait for actual work to finish.
  const value = await promise;

  // Ensure total time >= delayMs + minMs (so spinner is visible for minMs)
  const elapsed = performance.now() - start;
  const minTotal = delayMs + minMs;

  if (elapsed < minTotal) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, minTotal - elapsed));
  }

  return value;
}
