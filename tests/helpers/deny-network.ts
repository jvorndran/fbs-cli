const offlineGuardMarker = Symbol.for("fbs-cli.offline-fetch-guard");

if (process.env.CFBD_LIVE_TESTS !== "1") {
  const denyNetwork = async (input: RequestInfo | URL): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input);
    const url = new URL(request.url);
    throw new Error(
      `Offline test attempted a network request: ${request.method} ${url.origin}${url.pathname}`,
    );
  };

  Object.defineProperty(denyNetwork, offlineGuardMarker, {
    value: true,
    enumerable: false,
  });
  globalThis.fetch = denyNetwork as unknown as typeof globalThis.fetch;
}

export {};
