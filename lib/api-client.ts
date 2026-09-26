const fallbackMessage = 'Não foi possível concluir. Tente novamente.';

export class ApiClientError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const response = await fetch(path, {
    method,
    headers:
      body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: 'no-store',
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (signal?.aborted)
      throw new DOMException('Request aborted', 'AbortError');
    throw new ApiClientError(response.status, fallbackMessage);
  }
  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : fallbackMessage;
    throw new ApiClientError(response.status, message);
  }
  return data as T;
}
