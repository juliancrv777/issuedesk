import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import type { Ticket, TicketDetail, TicketPage } from '../../lib/tickets.ts';

// This suite always starts its own local Worker and disposable D1 database.
// It deliberately accepts no external base URL or production credentials.
let runtime: string;
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
before(
  async () => {
    await readFile(config); // Run npm run build first.
    runtime = await mkdtemp(join(tmpdir(), 'issuedesk-http-'));
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
        if (response.ok) return;
      } catch {
        /* Local Worker may still be starting. */
      }
      await delay(100);
    }
    assert.fail(`Local Worker did not become healthy.\n${logs}`);
  },
  { timeout: 90000 },
);
after(async () => {
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
});
async function api<T>(
  path: string,
  expected = 200,
  method = 'GET',
  body?: unknown,
) {
  const response = await fetch(`${baseURL}${path}`, {
    method,
    headers:
      body === undefined
        ? undefined
        : { 'Content-Type': 'application/json', Origin: baseURL },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return data as T;
}
function fields() {
  return {
    title: 'Teste HTTP de atendimento',
    description: 'Solicitação fictícia criada pelo teste de integração.',
    requester: 'Equipe de teste',
    assignee: 'Ana',
    priority: 'high',
  };
}
test('HTTP ticket lifecycle persists edits, comments, transitions and retry keys', async () => {
  const input = { ...fields(), creation_key: crypto.randomUUID() };
  let ticket = await api<Ticket>('/api/tickets', 201, 'POST', input);
  const path = `/api/tickets/${ticket.id}`;
  assert.equal(ticket.status, 'open');
  assert.equal(
    (await api<Ticket>('/api/tickets', 201, 'POST', input)).id,
    ticket.id,
  );
  await api(`${path}/status`, 422, 'PATCH', {
    status: 'resolved',
    version: ticket.version,
  });
  ticket = await api<Ticket>(path, 200, 'PATCH', {
    ...fields(),
    title: 'Assunto atualizado via HTTP',
    version: ticket.version,
  });
  await api(path, 409, 'PATCH', { ...fields(), version: 1 });
  ticket = await api<Ticket>(`${path}/status`, 200, 'PATCH', {
    status: 'in_progress',
    version: ticket.version,
  });
  const comment = {
    id: crypto.randomUUID(),
    body: 'Correção validada pela equipe de teste.',
  };
  await api(`${path}/comments`, 201, 'POST', comment);
  await api(`${path}/comments`, 201, 'POST', comment);
  ticket = await api<Ticket>(`${path}/status`, 200, 'PATCH', {
    status: 'resolved',
    version: ticket.version,
  });
  assert.equal(ticket.status, 'resolved');
  const detail = await api<TicketDetail>(path);
  assert.equal(detail.ticket.title, 'Assunto atualizado via HTTP');
  assert.equal(
    detail.activity.filter((event) => event.kind === 'comment').length,
    1,
  );
  assert.equal(detail.activity.length, 5);
  ticket = await api<Ticket>(`${path}/status`, 200, 'PATCH', {
    status: 'open',
    version: ticket.version,
  });
  assert.equal(ticket.status, 'open');
});
test('HTTP search, filters and pagination return persisted records', async () => {
  const marker = crypto.randomUUID();
  for (let index = 0; index < 12; index++) {
    await api('/api/tickets', 201, 'POST', {
      ...fields(),
      title: `${marker} item ${index}`,
      creation_key: crypto.randomUUID(),
    });
  }
  const query = `/api/tickets?q=${marker}&status=open&priority=high`;
  const first = await api<TicketPage>(query);
  const second = await api<TicketPage>(`${query}&page=2`);
  assert.equal(first.total, 12);
  assert.equal(first.data.length, 10);
  assert.equal(second.data.length, 2);
  assert.equal(
    new Set([...first.data, ...second.data].map((ticket) => ticket.id)).size,
    12,
  );
  assert.equal(
    (await api<TicketPage>(query.replace('status=open', 'status=resolved')))
      .total,
    0,
  );
  await api('/api/tickets?page=0', 400);
  await api('/api/tickets/999999', 404);
});
test('HTTP boundary rejects foreign origins, malformed JSON and oversized bodies without writing', async () => {
  const initial = await api<TicketPage>('/api/tickets');
  const cases: {
    status: number;
    headers: Record<string, string>;
    body: string;
  }[] = [
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://foreign.invalid',
      },
      body: JSON.stringify({ ...fields(), creation_key: crypto.randomUUID() }),
    },
    { status: 415, headers: { 'Content-Type': 'text/plain' }, body: '{}' },
    { status: 400, headers: { 'Content-Type': 'application/json' }, body: '{' },
    {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'x'.repeat(20001) }),
    },
  ];
  for (const item of cases) {
    const response = await fetch(`${baseURL}/api/tickets`, {
      method: 'POST',
      headers: item.headers,
      body: item.body,
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== item.status) {
      const responseText = await response.text();
      await delay(100);
      assert.fail(
        `Expected ${item.status}, got ${response.status}: ${responseText}\n${logs.slice(-4000)}`,
      );
    }
    const error = (await response.json()) as { error: unknown };
    assert.equal(typeof error.error, 'string');
  }
  await api('/api/tickets', 400, 'POST', {
    ...fields(),
    title: ' ',
    creation_key: crypto.randomUUID(),
  });
  assert.equal((await api<TicketPage>('/api/tickets')).total, initial.total);
});
