export async function fetchOrThrow(
  url: string,
  init?: RequestInit,
  errorPrefix = 'Request failed',
): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${errorPrefix}: ${response.status} ${response.statusText}${text ? ` – ${text}` : ''}`);
  }
  return response;
}

export async function readJsonOrText<T = unknown>(response: Response): Promise<T> {
  if (response.status === 204) return {} as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export async function requestJsonOrText<T = unknown>(
  url: string,
  init?: RequestInit,
  errorPrefix = 'Request failed',
): Promise<T> {
  const response = await fetchOrThrow(url, init, errorPrefix);
  return readJsonOrText<T>(response);
}
