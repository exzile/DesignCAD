import { describe, expect, it } from 'vitest';

import { getStubAnswerUrl, runStubAnswer } from './stubLoader';

const stubAnswerBytes = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x0a, 0x01, 0x06, 0x61, 0x6e, 0x73, 0x77, 0x65, 0x72, 0x00, 0x00,
  0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b,
]);

describe('Vite WASM loading', () => {
  it('keeps a wasm artifact URL and lazy-loads the module on demand', async () => {
    const stubWasmUrl = await getStubAnswerUrl();
    expect(stubWasmUrl).toMatch(/stub-answer\.wasm/);

    const fetchWasm = async (url: string): Promise<Response> => {
      expect(url).toBe(stubWasmUrl);
      return new Response(stubAnswerBytes, { headers: { 'content-type': 'application/wasm' } });
    };

    await expect(runStubAnswer(fetchWasm)).resolves.toBe(42);
  });
});
