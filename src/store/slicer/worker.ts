let slicerWorker: Worker | null = null;
let activeSliceRequestId = 0;
let workerBusy = false;

export function getSlicerWorker(onMessage: (e: MessageEvent) => void): Worker {
  if (!slicerWorker) {
    slicerWorker = new Worker(
      new URL('../../workers/SlicerWorker.ts', import.meta.url),
      { type: 'module' },
    );
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
