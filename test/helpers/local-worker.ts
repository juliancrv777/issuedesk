import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

export async function startLocalWorker() {
  // This suite always starts its own local Worker and disposable D1 database.
  // It deliberately accepts no external base URL or production credentials.
  let runtime: string | undefined;
  let server: ChildProcess | undefined;
  let baseURL: string;
  let logs = '';
  const config = 'dist/server/wrangler.json';
  const cli = ['--import', './scripts/sites-env.mjs'];
  function child(
    args: string[],
    script = './node_modules/wrangler/bin/wrangler.js',
  ) {
    const processHandle = spawn(process.execPath, [...cli, script, ...args], {
      env: { ...process.env, SITES_RUNTIME_ROOT: runtime, CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    processHandle.stdout!.on('data', (chunk) => {
      logs = (logs + chunk).slice(-16000);
    });
    processHandle.stderr!.on('data', (chunk) => {
      logs = (logs + chunk).slice(-16000);
    });
    return processHandle;
  }
  async function run(args: string[]) {
    const command = child(args);
    const timer = setTimeout(() => command.kill('SIGTERM'), 30000);
    try {
      const [code] = await once(command, 'exit');
      assert.equal(code, 0, logs);
    } finally {
      clearTimeout(timer);
    }
  }
  try {
    await readFile(config); // Run npm run build first.
    runtime = await mkdtemp(join(tmpdir(), 'issuedesk-test-'));
    const journal = JSON.parse(
      await readFile('drizzle/meta/_journal.json', 'utf8'),
    );
    for (const entry of journal.entries) {
      await run([
        'd1',
        'execute',
        'DB',
        '--config',
        config,
        '--local',
        '--persist-to',
        runtime,
        '--file',
        `drizzle/${entry.tag}.sql`,
      ]);
    }
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const address = socket.address();
    assert.ok(address && typeof address === 'object');
    const port = address.port;
    await new Promise<void>((resolve, reject) =>
      socket.close((error) => (error ? reject(error) : resolve())),
    );
    baseURL = `http://127.0.0.1:${port}`;
    server = child([String(port), runtime], './scripts/test-server.mjs');
    const started = Date.now();
    while (Date.now() - started < 30000) {
      assert.equal(server.exitCode, null, logs);
      try {
        const response = await fetch(`${baseURL}/api/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) return { baseURL, stop };
      } catch {
        /* Local Worker may still be starting. */
      }
      await delay(100);
    }
    assert.fail(`Local Worker did not become healthy.\n${logs}`);
  } catch (error) {
    await stop();
    throw error;
  }
  async function stop() {
    if (server && server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      const timer = setTimeout(() => server?.kill('SIGKILL'), 5000);
      try {
        await exited;
      } finally {
        clearTimeout(timer);
      }
    }
    if (runtime) await rm(runtime, { recursive: true, force: true });
  }
}
