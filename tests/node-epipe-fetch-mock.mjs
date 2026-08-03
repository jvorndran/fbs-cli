const expectedKey = process.env.FBS_EPIPE_TEST_EXPECTED_KEY;

if (!expectedKey) {
  throw new Error("EPIPE fetch mock requires an isolated test key.");
}

globalThis.fetch = async (input) => {
  const request = input instanceof Request ? input : new Request(input);
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== "https://api.collegefootballdata.com" ||
    url.pathname !== "/games" ||
    request.headers.get("Authorization") !== `Bearer ${expectedKey}`
  ) {
    throw new Error("EPIPE smoke made an unexpected request.");
  }

  const games = Array.from({ length: 20_000 }, (_, index) => ({
    id: index + 1,
    season: 2026,
    week: 1,
    seasonType: "regular",
    completed: false,
    homeTeam: "Home",
    awayTeam: "Away",
  }));

  return new Response(JSON.stringify(games), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
