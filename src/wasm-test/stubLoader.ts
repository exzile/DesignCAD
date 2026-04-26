const wasmArtifacts = import.meta.glob('./**/*.wasm', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>;

type StubAnswerExports = WebAssembly.Exports & {
  answer(): number;
};

type WasmFetch = (url: string) => Promise<Response>;

export async function getStubAnswerUrl(): Promise<string> {
  const loadUrl = wasmArtifacts['./stub-answer.wasm'];
  if (!loadUrl) throw new Error('Missing stub-answer.wasm artifact');
  return loadUrl();
}

export async function loadStubAnswer(fetchWasm: WasmFetch = fetch): Promise<StubAnswerExports> {
  const stubWasmUrl = await getStubAnswerUrl();
  const response = await fetchWasm(stubWasmUrl);
  const { instance } = await WebAssembly.instantiateStreaming(response);
  return instance.exports as StubAnswerExports;
}

export async function runStubAnswer(fetchWasm?: WasmFetch): Promise<number> {
  const exports = await loadStubAnswer(fetchWasm);
  return exports.answer();
}
