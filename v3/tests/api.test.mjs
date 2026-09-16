import test from 'node:test';
import assert from 'node:assert/strict';
import { StoreApiError, fetchStore, postPayload } from '../js/api.js';

const okResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload),
});

test('fetchStore calls configured endpoint with action=store and returns payload', async () => {
  let calledUrl = '';
  const fetchImpl = async (url) => {
    calledUrl = String(url);
    return okResponse({ success: true, products: [] });
  };
  const result = await fetchStore({ fetchImpl, now: () => 12345, timeoutMs: 1000 });
  assert.equal(result.success, true);
  assert.match(calledUrl, /action=store/);
  assert.match(calledUrl, /_=12345/);
});

test('fetchStore throws typed http error for non-ok response', async () => {
  await assert.rejects(
    fetchStore({ fetchImpl: async () => okResponse({}, 503), timeoutMs: 1000 }),
    (error) => error instanceof StoreApiError && error.code === 'HTTP_ERROR' && error.status === 503,
  );
});

test('fetchStore throws typed invalid-json error', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, text: async () => '<html>bad</html>' });
  await assert.rejects(
    fetchStore({ fetchImpl, timeoutMs: 1000 }),
    (error) => error instanceof StoreApiError && error.code === 'INVALID_JSON',
  );
});

test('fetchStore propagates backend failure as typed error', async () => {
  await assert.rejects(
    fetchStore({ fetchImpl: async () => okResponse({ success: false, error: 'boom' }), timeoutMs: 1000 }),
    (error) => error instanceof StoreApiError && error.code === 'BACKEND_ERROR' && /boom/.test(error.message),
  );
});


test('fetchStore turns an aborted request into a timeout error', async () => {
  const fetchImpl = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });
  await assert.rejects(
    fetchStore({ fetchImpl, timeoutMs: 5 }),
    (error) => error instanceof StoreApiError && error.code === 'TIMEOUT',
  );
});


test('postPayload sends JSON payload using existing Apps Script form contract', async () => {
  let request = null;
  const fetchImpl = async (url, options) => {
    request = { url: String(url), options };
    return okResponse({ success: true, orderNumber: 'X1' });
  };
  const result = await postPayload({ action: 'feedback', text: 'hello' }, { fetchImpl, timeoutMs: 1000 });
  assert.equal(result.orderNumber, 'X1');
  assert.equal(request.options.method, 'POST');
  assert.match(String(request.options.body), /payload=/);
  const body = new URLSearchParams(request.options.body);
  assert.deepEqual(JSON.parse(body.get('payload')), { action: 'feedback', text: 'hello' });
});
