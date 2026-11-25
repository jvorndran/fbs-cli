import { expect, test } from "bun:test";
import { parse } from "yaml";
import type { CfbdApi } from "../src/cfbd/api";
import { runCli } from "../src/index";

const rows = [
  {team:"A",rating:10,ranking:7,offense:{rating:30},defense:{rating:20},specialTeams:{rating:-1.123456789}},
  {team:"B",rating:20,ranking:1,offense:{rating:40},defense:{rating:10},specialTeams:{rating:0}},
  {team:"C",rating:5,ranking:30,offense:{rating:25},defense:{rating:20},specialTeams:{rating:1.123456789}},
  {team:"Missing",rating:0,specialTeams:{rating:null}},
];
async function invoke(flags: string[]) {
  const requests: unknown[] = [];
  const api = {async spRatings(query: unknown) {requests.push(query); return rows;}} as unknown as CfbdApi;
  let stdout="",stderr="";
  const exitCode=await runCli(["ratings","sp",...flags],{api,environment:{},io:{
    stdout:value=>{stdout+=value;},stderr:value=>{stderr+=value;}}});
  return {exitCode,stdout,stderr,requests};
}
test("SP special-teams bounds preserve signed precision, zero, order and missing semantics",async()=>{
  for(const [flags,teams] of [
    [["--min-special-teams-rating=-1.123456789","--max-special-teams-rating=0"],["A","B"]],
    [["--min-special-teams-rating=0","--max-special-teams-rating=0"],["B"]],
    [["--min-special-teams-rating=1.123456789","--max-special-teams-rating=1.123456789"],["C"]],
    [["--max-special-teams-rating=0"],["A","B"]],
    [[],["A","B","C","Missing"]],
  ] as const){
    const r=await invoke(["--year=2026",...flags]); expect(r.exitCode).toBe(0);expect(r.stderr).toBe("");
    expect(r.requests).toEqual([{year:2026}]); const doc=parse(r.stdout);
    expect(doc.sp_ratings.map((row:{team:string})=>row.team)).toEqual(teams);expect(doc.count).toBe(teams.length);
    if(teams.some(team=>team==="A")) expect(doc.sp_ratings[0].special_teams.rating).toBe(-1.123456789);
    if(!flags.length) expect(doc.filters).toBeUndefined();
  }
});
test("SP special-teams bounds compose with national-rank team selection and other unit bounds",async()=>{
  const r=await invoke(["--year=2026","--team=A","--min-special-teams-rating=-2","--max-special-teams-rating=0",
    "--min-rating=10","--min-offense-rating=30","--max-defense-rating=20"]);
  expect(r.exitCode).toBe(0);expect(r.requests).toEqual([{year:2026}]);
  const doc=parse(r.stdout);expect(doc.query).toEqual({year:2026,team:"A"});expect(doc.count).toBe(1);
  expect(doc.sp_ratings[0].ranking).toBe(7);
  expect(doc.filters).toEqual({min_rating:10,min_offense_rating:30,max_defense_rating:20,
    min_special_teams_rating:-2,max_special_teams_rating:0});
  const teamOnly=await invoke(["--team=A","--min-special-teams-rating=0"]);
  expect(teamOnly.requests).toEqual([{team:"A"}]);
});
for(const flags of [["--min-special-teams-rating=2","--max-special-teams-rating=1"],
  ["--min-special-teams-rating=NaN"],["--max-special-teams-rating=Infinity"],
  ["--min-special-teams-rating=0"]]) test(`invalid SP special teams ${flags.join(" ")}`,async()=>{
  const r=await invoke(flags.length===1&&flags[0]==="--min-special-teams-rating=0"?flags:["--year=2026",...flags]);
  expect(r.exitCode).toBe(2);expect(r.stdout).toBe("");expect(r.requests).toEqual([]);expect(parse(r.stderr).error).toBeDefined();
});
test("SP help exposes special-teams bounds",async()=>{
  const r=await invoke(["--help"]);expect(r.exitCode).toBe(0);expect(r.requests).toEqual([]);
  for(const p of ["min","max"])expect(r.stdout).toContain(`--${p}-special-teams-rating <number>`);
});
