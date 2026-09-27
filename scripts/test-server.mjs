import { dirname, join, resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { unstable_getMiniflareWorkerOptions } from 'wrangler';

// Run the compiled Worker without Wrangler's development proxy or hot reload.
// Wrangler is pinned; its config adapter keeps bindings aligned with the build.
const { workerOptions, main, externalWorkers } =
  unstable_getMiniflareWorkerOptions('dist/server/wrangler.json');
if (!main) throw new Error('Build the application before running HTTP tests.');
const root = dirname(resolve(main));
const files = await readdir(root, { recursive: true });
const modules = [
  { type: 'ESModule', path: resolve(main) },
  ...files
    .filter(
      (file) => /\.m?js$/.test(file) && resolve(root, file) !== resolve(main),
    )
    .map((file) => ({ type: 'ESModule', path: join(root, file) })),
];
const worker = new Miniflare({
  host: '127.0.0.1',
  port: Number(process.argv[2]),
  cf: false,
  d1Persist: join(process.argv[3], 'v3', 'd1'),
  workers: [
    { ...workerOptions, modules, modulesRoot: root },
    ...externalWorkers,
  ],
});
await worker.ready;
process.once('SIGTERM', async () => {
  await worker.dispose();
  process.exit(0);
});
