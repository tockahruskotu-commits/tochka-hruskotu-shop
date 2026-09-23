import { CONFIG } from './config.js';

export class StoreApiError extends Error {
  constructor(message, { code = 'STORE_API_ERROR', status = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'StoreApiError';
    this.code = code;
    this.status = status;
  }
}

function buildStoreUrl(now) {
  const url = new URL(CONFIG.api.store);
  url.searchParams.set('action', 'store');
  url.searchParams.set('_', String(now()));
  return url.toString();
}

export async function fetchStore({
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  now = Date.now,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new StoreApiError('Fetch API недоступний.', { code: 'FETCH_UNAVAILABLE' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetchImpl(buildStoreUrl(now), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        throw new StoreApiError('Перевищено час очікування відповіді магазину.', {
          code: 'TIMEOUT',
          cause: error,
        });
      }
      throw new StoreApiError('Не вдалося з’єднатися з магазином.', {
        code: 'NETWORK_ERROR',
        cause: error,
      });
    }

    if (!response?.ok) {
      throw new StoreApiError(`Сервер магазину відповів ${response?.status ?? 'невідомим статусом'}.`, {
        code: 'HTTP_ERROR',
        status: response?.status ?? null,
      });
    }

    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      throw new StoreApiError('Сервер магазину повернув некоректну JSON-відповідь.', {
        code: 'INVALID_JSON',
        cause: error,
      });
    }

    if (!payload || payload.success !== true) {
      throw new StoreApiError(payload?.error || 'Магазин не підтвердив успішне завантаження даних.', {
        code: 'BACKEND_ERROR',
      });
    }

    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function postPayload(payload, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new StoreApiError('Fetch API недоступний.', { code: 'FETCH_UNAVAILABLE' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const body = new URLSearchParams();
  body.set('payload', JSON.stringify(payload ?? {}));
  try {
    let response;
    try {
      response = await fetchImpl(CONFIG.api.store, {
        method: 'POST',
        body,
        redirect: 'follow',
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        throw new StoreApiError('Перевищено час очікування відповіді сервера.', { code: 'TIMEOUT', cause: error });
      }
      throw new StoreApiError('Не вдалося передати дані на сервер.', { code: 'NETWORK_ERROR', cause: error });
    }
    if (!response?.ok) {
      throw new StoreApiError(`Сервер відповів ${response?.status ?? 'невідомим статусом'}.`, { code: 'HTTP_ERROR', status: response?.status ?? null });
    }
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); }
    catch (error) { throw new StoreApiError('Сервер повернув некоректну JSON-відповідь.', { code: 'INVALID_JSON', cause: error }); }
    if (!result?.success) throw new StoreApiError(result?.error || 'Сервер не підтвердив виконання операції.', { code: 'BACKEND_ERROR' });
    return result;
  } finally {
    clearTimeout(timer);
  }
}
