import { appendFileSync } from "node:fs";

const expectedKey = process.env.FBS_AUTH_TEST_EXPECTED_KEY;
const requestLog = process.env.FBS_AUTH_TEST_REQUEST_LOG;

if (!expectedKey || !requestLog) {
  throw new Error("Auth fetch mock requires isolated test configuration.");
}

let requestCount = 0;

globalThis.fetch = async (input) => {
  requestCount += 1;
  if (requestCount !== 1) {
    throw new Error("Auth made more than one validation request.");
  }

  const request = input instanceof Request ? input : new Request(input);
  if (
    request.method !== "GET" ||
    request.url !== "https://api.collegefootballdata.com/info" ||
    request.headers.get("Authorization") !== `Bearer ${expectedKey}`
  ) {
    throw new Error("Auth made an unexpected validation request.");
  }

  appendFileSync(requestLog, "GET /info\n", "utf8");
  return new Response("{}", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
