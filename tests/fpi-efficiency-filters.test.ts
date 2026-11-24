import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const units = ["overall", "offense", "defense", "special-teams"];
const rows = [
  {team:"A", fpi:10.123456789, efficiencies:{overall:70.123456789,offense:90,defense:80,specialTeams:60}},
  {team:"B", fpi:0, efficiencies:{overall:70.123456789,offense:90,defense:80,specialTeams:60}},
  {team:"Zero", fpi:0, efficiencies:{overall:0,offense:0,defense:0,specialTeams:0}},
  {team:"Partial", efficiencies:{offense:100}},
  {team:"Missing", efficiencies:null},
];
async function invoke(flags: string[]) {
  const requests: unknown[] = [];
  const api = {async fpiRatings(query: unknown) {requests.push(query); return rows;}} as unknown as CfbdApi;
  let stdout = "", stderr = "";
  const exitCode = await runCli(["ratings","fpi",...flags], {api,environment:{},io:{
    stdout:value=>{stdout+=value;},stderr:value=>{stderr+=value;}}});
  return {exitCode,stdout,stderr,requests};
}
test("FPI efficiency bounds compose with rating and provider scopes without rounding", async () => {
  const flags = units.flatMap((unit,i)=>[`--min-${unit}-efficiency=${[70.123456789,90,80,60][i]}`,`--max-${unit}-efficiency=${[70.123456789,90,80,60][i]}`]);
  const result = await invoke(["--year=2026","--conference=ACC","--min-fpi=1",...flags]);
  expect(result.exitCode).toBe(0); expect(result.stderr).toBe("");
  expect(result.requests).toEqual([{year:2026,conference:"ACC"}]);
  const output = parse(result.stdout);
  expect(output.query).toEqual(result.requests[0]); expect(output.count).toBe(1);
  expect(output.fpi_ratings[0].team).toBe("A");
  expect(output.fpi_ratings[0].efficiencies.overall).toBe(70.123456789);
  expect(output.filters).toEqual(Object.fromEntries([["min_fpi",1],...units.flatMap((unit,i)=>[
    [`min_${unit.replaceAll("-","_")}_efficiency`,[70.123456789,90,80,60][i]],
    [`max_${unit.replaceAll("-","_")}_efficiency`,[70.123456789,90,80,60][i]]])]));
});
for (const unit of units) {
  test(`FPI ${unit} filters include zero and fail only missing active values`, async () => {
    for (const [flags,teams] of [
      [[`--min-${unit}-efficiency=0`,`--max-${unit}-efficiency=0`],["Zero"]],
      [[`--max-${unit}-efficiency=100`],unit==="offense"?["A","B","Zero","Partial"]:["A","B","Zero"]],
      [[`--min-${unit}-efficiency=1`],unit==="offense"?["A","B","Partial"]:["A","B"]],
    ] as const) {
      const result=await invoke(["--year=2026",...flags]); expect(result.exitCode).toBe(0);
      expect(result.requests).toEqual([{year:2026}]);
      expect(parse(result.stdout).fpi_ratings.map((row:{team:string})=>row.team)).toEqual(teams);
    }
  });
  for (const [flags,code] of [
    [[`--min-${unit}-efficiency=80`,`--max-${unit}-efficiency=20`],"invalid_query"],
    [[`--min-${unit}-efficiency=-1`],"invalid_query"],
    [[`--max-${unit}-efficiency=101`],"invalid_query"],
    [[`--min-${unit}-efficiency=NaN`],"cli_parse_error"],
    [[`--max-${unit}-efficiency=Infinity`],"cli_parse_error"],
  ] as const) test(`invalid FPI efficiency ${flags.join(" ")}`,async()=>{
    const result=await invoke(["--year=2026",...flags]); expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe(""); expect(result.requests).toEqual([]);
    expect(parse(result.stderr).error.code).toBe(code);
  });
}
test("FPI keeps unfiltered rows, required scope and help",async()=>{
  const result=await invoke(["--year=2026"]); expect(result.exitCode).toBe(0);
  expect(parse(result.stdout).count).toBe(rows.length); expect(parse(result.stdout).filters).toBeUndefined();
  const missing=await invoke(["--min-offense-efficiency=0"]);
  expect(missing.exitCode).toBe(2); expect(missing.requests).toEqual([]);
  const help=await invoke(["--help"]); expect(help.requests).toEqual([]);
  for(const unit of units) for(const prefix of ["min","max"]) expect(help.stdout).toContain(`--${prefix}-${unit}-efficiency <number>`);
});
