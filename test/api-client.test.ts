import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClientError, request } from '../lib/api-client.ts';

test('JSON requests preserve payload and cancellation signal', async (t) => {
  const controller = new AbortController();
  t.mock.method(
    globalThis,
    'fetch',
    async (path: string, init: RequestInit) => {
      assert.equal(path, '/api/tickets');
      assert.equal(init.method, 'POST');
      assert.deepEqual(JSON.parse(init.body as string), {
        title: 'Example',
        clientId: 'retry-key',
      });
      assert.equal(init.signal, controller.signal);
      assert.deepEqual(init.headers, { 'Content-Type': 'application/json' });
      return Response.json({ id: 7 });
    },
  );
  assert.deepEqual(
    await request('/api/tickets', {
      method: 'POST',
      body: { title: 'Example', clientId: 'retry-key' },
      signal: controller.signal,
    }),
    { id: 7 },
  );
});

test('stale-write errors retain server message and status', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      { error: 'Atualize o chamado antes de salvar.' },
      { status: 409 },
    ),
  );
  await assert.rejects(
    request('/api/tickets/7'),
    (error: unknown) =>
      error instanceof ApiClientError &&
      error.status === 409 &&
      error.message === 'Atualize o chamado antes de salvar.',
  );
});

test('non-JSON server failures show a safe fallback', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response('<html>Gateway unavailable</html>', { status: 502 }),
  );
  await assert.rejects(
    request('/api/tickets'),
    (error: unknown) =>
      error instanceof ApiClientError &&
      error.status === 502 &&
      error.message === 'Não foi possível concluir. Tente novamente.',
  );
});

test('cancellation while reading a response remains an AbortError', async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => {
    controller.abort();
    return new Response('');
  });
  await assert.rejects(request('/api/tickets', { signal: controller.signal }), {
    name: 'AbortError',
  });
});
