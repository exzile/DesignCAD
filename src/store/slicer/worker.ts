let slicerWorker: Worker | null = null;
let slicerWorkerUrl: string | null = null;
let activeSliceRequestId = 0;
let workerBusy = false;

export function getSlicerWorker(onMessage: (e: MessageEvent) => void): Worker {
  // Vite rewrites the URL of `new URL('./worker.ts', import.meta.url)`
  // to include a content hash. After a hot rebuild of the worker source
  // (or any of its transitive imports), the URL Vite resolves NOW
  // differs from the URL we used when we first constructed the cached
  // worker. Detecting that mismatch lets us terminate the stale worker
  // and respawn with the new code, without forcing the user to hard-
  // reload the tab. In production builds the URL is content-hashed
  // once at build time, so the mismatch never fires.
  const currentUrl = new URL('../../workers/SlicerWorker.ts', import.meta.url).href;
  if (slicerWorker && slicerWorkerUrl !== currentUrl) {
    slicerWorker.terminate();
    slicerWorker = null;
    slicerWorkerUrl = null;
    workerBusy = false;
  }
  if (!slicerWorker) {
    slicerWorker = new Worker(currentUrl, { type: 'module' });
    slicerWorkerUrl = currentUrl;
  }
  slicerWorker.onmessage = onMessage;
  return slicerWorker;
}

export function getCurrentSlicerWorker(): Worker | null {
  return slicerWorker;
}

export function isWorkerBusy(): boolean {
  return workerBusy;
}

export function setWorkerBusy(busy: boolean): void {
  workerBusy = busy;
}

export function nextSliceRequestId(): number {
  activeSliceRequestId += 1;
  return activeSliceRequestId;
}

export function getActiveSliceRequestId(): number {
  return activeSliceRequestId;
}

/**
 * Force-terminate and reset the slicer worker. The next call to
 * `getSlicerWorker` will spawn a fresh one with the latest code.
 *
 * Wired to:
 *   • Vite HMR (dev-only) so source-file edits recreate the worker
 *     instead of leaving the old one running with stale code. This is
 *     the cause we ran into where rebuilds of `SlicerWorker.ts` or its
 *     transitive imports kept showing old slicer behaviour until the
 *     entire page was hard-reloaded.
 *   • A user-facing "Reload Slicer" debug action (callable via the
 *     store) so users can manually nuke a stuck worker.
 */
export function resetSlicerWorker(): void {
  if (slicerWorker) {
    slicerWorker.terminate();
    slicerWorker = null;
    slicerWorkerUrl = null;
  }
  workerBusy = false;
}

// Vite HMR dispose hook — tear the worker down whenever this module's
// HMR boundary fires. Combined with the URL-mismatch check above,
// covers two distinct staleness paths:
//   • This module changes (e.g. its surrounding store glue) → dispose.
//   • The worker source or its deps change → URL hash differs → reset
//     fires inside `getSlicerWorker` on next call.
//
// Production builds strip `import.meta.hot` entirely, so this is dev-
// only behaviour.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (slicerWorker) {
      slicerWorker.terminate();
      slicerWorker = null;
      slicerWorkerUrl = null;
    }
    workerBusy = false;
  });
}
