/**
 * withSmartLoading prevents loading spinner "flicker" for very fast requests.
 *
 * @param promise The async work to perform
 * @param opts Configuration for delay and minimum visibility
 * @returns The result of the promise
 */
export async function withSmartLoading<T>(
  promise: Promise<T>,
  opts?: { delayMs?: number; minMs?: number }
): Promise<T> {
  const delayMs = opts?.delayMs ?? 150; // don't show spinner before this
  const minMs = opts?.minMs ?? 300; // once shown, keep at least this long

  const start = performance.now();

  // This resolves after delayMs. If the work completes before it, we never "show" loading.
  let showLoading = false;
  const delay = new Promise<void>((resolve) =>
    window.setTimeout(() => {
      showLoading = true;
      resolve();
    }, delayMs)
  );

  const result = await Promise.race([
    promise.then((v) => ({ type: "done" as const, v })),
    delay.then(() => ({ type: "delay" as const })),
  ]);

  if (result.type === "done") {
    return result.v;
  }

  // Spinner would be shown now. Wait for actual promise result,
  // and ensure min visible time from "show" moment.
  const value = await promise;
  const elapsed = performance.now() - start;

  const minTotal = delayMs + minMs;
  if (elapsed < minTotal) {
    await new Promise((r) => window.setTimeout(r, minTotal - elapsed));
  }

  return value;
}
