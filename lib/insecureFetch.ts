import "server-only";

import https from "https";

const insecureHttpsAgent = new https.Agent({ rejectUnauthorized: false });

type InsecureRequestInit = RequestInit & {
  agent?: https.Agent;
};

function resolveUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }

  if (typeof input === "string") {
    return new URL(input);
  }

  return new URL(input.url);
}

export async function insecureFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = resolveUrl(input);

  if (url.protocol !== "https:") {
    throw new Error(`insecureFetch requires https URLs (received ${url.protocol})`);
  }

  const requestInit: InsecureRequestInit = { ...init, agent: insecureHttpsAgent };
  return fetch(input, requestInit);
}
