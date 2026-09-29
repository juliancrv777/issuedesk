import { test as base, expect } from '@playwright/test';
import { startLocalWorker } from '../helpers/local-worker.ts';

export const test = base.extend<{}, { localWorker: Awaited<ReturnType<typeof startLocalWorker>> }>({
  localWorker: [async ({}, use) => {
    const worker = await startLocalWorker();
    try {
      await use(worker);
    } finally {
      await worker.stop();
    }
  }, { scope: 'worker', timeout: 90000 }],
  baseURL: async ({ localWorker }, use) => { await use(localWorker.baseURL); },
});
export { expect };
