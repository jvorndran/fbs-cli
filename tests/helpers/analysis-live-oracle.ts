import type {
  AdvancedGameStat,
  Drive,
  Game,
  GameHavocStats,
  GamePlayerStats,
  Play,
} from "cfbd";

export type CapturedAnalysisResponses = Map<string, unknown[][]>;

type Kind = "dropback" | "rush" | "other";
type Unit = "offense" | "defense";
type Category = "overall" | "passing" | "rushing";

interface OraclePlay {
  play: Play;
  kind: Kind;
  attempt: boolean;
  sack: boolean;
}

interface ValueWithSample {
  value?: number;
  sample: number;
}

interface CategoryValues {
  sample: number;
  components: Record<string, ValueWithSample>;
}

interface TeamGameUnit {
  game_id: number;
  team: string;
  opponent: string;
  unit: Unit;
  categories: Record<Category, CategoryValues>;
}

const COMPLETIONS = new Set([
  "pass completion",
  "pass reception",
  "passing touchdown",
]);
const INCOMPLETIONS = new Set(["pass incompletion"]);
const INTERCEPTIONS = new Set([
  "interception",
  "interception return",
  "interception return touchdown",
  "pass interception",
  "pass interception return",
  "pass interception return touchdown",
]);
const COMPONENTS: Record<Category, readonly string[]> = {
  overall: ["ppa", "success_rate", "explosive_rate"],
  passing: ["ppa_per_dropback", "success_rate", "explosive_rate", "sack_rate"],
  rushing: ["ppa_per_rush", "success_rate", "explosive_rate", "stuff_rate"],
};

function rows<T>(captured: CapturedAnalysisResponses, method: string): T[] {
  return (captured.get(method) ?? []).flat() as T[];
}

function sameTeam(left: string, right: string): boolean {
  return left.localeCompare(right, "en-US", { sensitivity: "base" }) === 0;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  const rounded = Math.sign(value) *
    (Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error("Live metric oracle encountered a zero rate denominator.");
  return round(numerator / denominator * 100, 1);
}

function avg(total: number, denominator: number, digits: number): number {
  if (denominator === 0) {
    throw new Error("Live metric oracle encountered a zero average denominator.");
  }
  return round(total / denominator, digits);
}

function mean(values: readonly number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classify(play: Play): OraclePlay {
  const type = play.playType.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
  if (COMPLETIONS.has(type) || INCOMPLETIONS.has(type) || INTERCEPTIONS.has(type)) {
    return { play, kind: "dropback", attempt: true, sack: false };
  }
  if (type === "sack") {
    return { play, kind: "dropback", attempt: false, sack: true };
  }
  if (type === "rush" || type === "rushing touchdown") {
    return { play, kind: "rush", attempt: false, sack: false };
  }
  return { play, kind: "other", attempt: false, sack: false };
}

function eligible(play: OraclePlay): boolean {
  return play.kind === "dropback" || play.kind === "rush";
}

function successful({ play }: OraclePlay): boolean {
  if (play.down === 1) return play.yardsGained >= play.distance * 0.5;
  if (play.down === 2) return play.yardsGained >= play.distance * 0.7;
  if (play.down === 3 || play.down === 4) return play.yardsGained >= play.distance;
  return false;
}

function explosive(value: OraclePlay): boolean {
  return value.kind === "rush"
    ? value.play.yardsGained >= 10
    : value.kind === "dropback" && value.play.yardsGained >= 20;
}

function unitMetrics(
  input: readonly OraclePlay[],
  advanced: readonly AdvancedGameStat[],
  havoc: readonly GameHavocStats[],
  side: Unit,
): Record<string, unknown> {
  const plays = input.filter(eligible);
  const passing = plays.filter((play) => play.kind === "dropback");
  const rushing = plays.filter((play) => play.kind === "rush");
  const early = plays.filter(({ play }) => play.down === 1 || play.down === 2);
  const ppa = plays.flatMap(({ play }) => typeof play.ppa === "number" ? [play.ppa] : []);
  const passPpa = passing.flatMap(({ play }) =>
    typeof play.ppa === "number" ? [play.ppa] : [],
  );
  const rushPpa = rushing.flatMap(({ play }) =>
    typeof play.ppa === "number" ? [play.ppa] : [],
  );
  const power = rushing.filter(({ play }) =>
    (play.down === 3 || play.down === 4) &&
    Math.min(play.distance, play.yardsToGoal) <= 2,
  );
  const advancedIds = new Set(advanced.map((row) => row.gameId));
  const coveredRushes = rushing.filter((play) => advancedIds.has(play.play.gameId));
  const lineYards = advanced.reduce(
    (sum, row) => sum + row[side].lineYardsTotal,
    0,
  );
  const havocValues = havoc.map((row) => row[side]);
  const havocPlays = havocValues.reduce((sum, value) => sum + value.totalPlays, 0);
  const havocKey = side === "offense" ? "havoc_allowed" : "havoc_created";

  return {
    early_down_pass_pct: pct(
      early.filter((play) => play.kind === "dropback").length,
      early.length,
    ),
    success_pct: pct(plays.filter(successful).length, plays.length),
    positive_ppa_pct: pct(ppa.filter((value) => value > 0).length, ppa.length),
    ppa_per_play: avg(ppa.reduce((sum, value) => sum + value, 0), ppa.length, 3),
    explosive_pct: pct(plays.filter(explosive).length, plays.length),
    negative_play_pct: pct(
      plays.filter(({ play }) => play.yardsGained < 0).length,
      plays.length,
    ),
    passing: {
      success_pct: pct(passing.filter(successful).length, passing.length),
      positive_ppa_pct: pct(
        passPpa.filter((value) => value > 0).length,
        passPpa.length,
      ),
      ppa_per_dropback: avg(
        passPpa.reduce((sum, value) => sum + value, 0),
        passPpa.length,
        3,
      ),
      explosive_pct: pct(passing.filter(explosive).length, passing.length),
      sack_pct: pct(passing.filter((play) => play.sack).length, passing.length),
    },
    rushing: {
      success_pct: pct(rushing.filter(successful).length, rushing.length),
      positive_ppa_pct: pct(
        rushPpa.filter((value) => value > 0).length,
        rushPpa.length,
      ),
      ppa_per_rush: avg(
        rushPpa.reduce((sum, value) => sum + value, 0),
        rushPpa.length,
        3,
      ),
      explosive_pct: pct(rushing.filter(explosive).length, rushing.length),
      stuff_pct: pct(
        rushing.filter(({ play }) => play.yardsGained <= 0).length,
        rushing.length,
      ),
      power_success_pct: pct(
        power.filter(({ play }) =>
          play.scoring ||
          play.yardsGained >= Math.min(play.distance, play.yardsToGoal),
        ).length,
        power.length,
      ),
      line_yards_per_rush: avg(lineYards, coveredRushes.length, 2),
    },
    [havocKey]: {
      defensive_back_pct: pct(
        havocValues.reduce((sum, value) => sum + value.dbHavocEvents, 0),
        havocPlays,
      ),
      front_seven_pct: pct(
        havocValues.reduce((sum, value) => sum + value.frontSevenHavocEvents, 0),
        havocPlays,
      ),
      total_pct: pct(
        havocValues.reduce((sum, value) => sum + value.totalHavocEvents, 0),
        havocPlays,
      ),
    },
  };
}

function isPunt(play: OraclePlay): boolean {
  return play.play.playType.trim().toLocaleLowerCase("en-US") === "punt";
}

function threeAndOut(input: readonly OraclePlay[]): boolean {
  const ordered = [...input].sort((left, right) =>
    (left.play.playNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.play.playNumber ?? Number.MAX_SAFE_INTEGER) ||
    left.play.id.localeCompare(right.play.id, "en-US"),
  );
  const scrimmage = ordered.filter(eligible);
  if (
    scrimmage.length !== 3 ||
    scrimmage.some(({ play }) => play.distance > 0 && play.yardsGained >= play.distance) ||
    scrimmage.slice(1).some(({ play }) => play.down === 1)
  ) return false;
  const finalIndex = ordered.lastIndexOf(scrimmage[2]!);
  return ordered.slice(finalIndex + 1).some(isPunt);
}

function driveMetrics(
  drives: readonly Drive[],
  plays: readonly OraclePlay[],
): Record<string, number> {
  const byDrive = new Map<string, OraclePlay[]>();
  for (const play of plays) {
    const group = byDrive.get(play.play.driveId) ?? [];
    group.push(play);
    byDrive.set(play.play.driveId, group);
  }
  const included = drives.flatMap((drive) => {
    const drivePlays = byDrive.get(drive.id) ?? [];
    return drivePlays.some(eligible) ? [{ drive, plays: drivePlays }] : [];
  });
  const points = included.map(({ drive }) =>
    Math.max(0, drive.endOffenseScore - drive.startOffenseScore),
  );
  const opportunities = included.filter(({ plays: drivePlays }) =>
    drivePlays.some((value) =>
      eligible(value) &&
      (
        value.play.yardsToGoal <= 40 ||
        value.play.yardsToGoal - Math.max(0, value.play.yardsGained) <= 40
      ),
    ),
  );
  const opportunityPoints = opportunities.reduce(
    (sum, { drive }) =>
      sum + Math.max(0, drive.endOffenseScore - drive.startOffenseScore),
    0,
  );
  return {
    points_per_drive: avg(
      points.reduce((sum, value) => sum + value, 0),
      included.length,
      2,
    ),
    touchdown_pct: pct(
      included.filter(({ drive }, index) =>
        /(?:^|\b)(?:td|touchdown)(?:\b|$)/iu.test(drive.driveResult) ||
        (points[index] ?? 0) >= 6,
      ).length,
      included.length,
    ),
    empty_drive_pct: pct(
      points.filter((value) => value === 0).length,
      included.length,
    ),
    three_and_out_pct: pct(
      included.filter(({ plays: drivePlays }) => threeAndOut(drivePlays)).length,
      included.length,
    ),
    scoring_opportunity_pct: pct(opportunities.length, included.length),
    points_per_scoring_opportunity: avg(
      opportunityPoints,
      opportunities.length,
      2,
    ),
    available_yards_pct: pct(
      included.reduce((sum, { drive }) => sum + drive.yards, 0),
      included.reduce((sum, { drive }) => sum + drive.startYardsToGoal, 0),
    ),
  };
}

function distanceBucket(distance: number): string {
  if (distance <= 3) return "short";
  if (distance <= 6) return "medium";
  if (distance <= 10) return "long";
  return "very_long";
}

function fieldZone(yardsToGoal: number): string {
  if (yardsToGoal >= 80) return "backed_up";
  if (yardsToGoal >= 51) return "own_territory";
  if (yardsToGoal >= 21) return "plus_territory";
  return "red_zone";
}

function scoreState({ play }: OraclePlay): string {
  const margin = play.offenseScore - play.defenseScore;
  if (margin <= -9) return "trailing_9_plus";
  if (margin < 0) return "trailing_1_8";
  if (margin === 0) return "tied";
  if (margin <= 8) return "leading_1_8";
  return "leading_9_plus";
}

function proeKeys(value: OraclePlay): [number, string, string, string] {
  return [
    value.play.down,
    distanceBucket(value.play.distance),
    fieldZone(value.play.yardsToGoal),
    scoreState(value),
  ];
}

function aggregateProe(
  targetInput: readonly OraclePlay[],
  baselineInput: readonly OraclePlay[],
): Record<string, number> {
  const target = targetInput.filter(eligible);
  const baseline = baselineInput.filter(eligible);
  const groups = new Map<string, OraclePlay[]>();
  for (const play of target) {
    const key = proeKeys(play).join("|");
    const group = groups.get(key) ?? [];
    group.push(play);
    groups.set(key, group);
  }
  let plays = 0;
  let actualPasses = 0;
  let expectedPasses = 0;
  for (const [serialized, group] of groups) {
    const [downValue, distance, field, score] = serialized.split("|");
    const down = Number(downValue);
    const candidates = [
      baseline.filter((play) => {
        const key = proeKeys(play);
        return key[0] === down && key[1] === distance && key[2] === field && key[3] === score;
      }),
      baseline.filter((play) => {
        const key = proeKeys(play);
        return key[0] === down && key[1] === distance && key[3] === score;
      }),
      baseline.filter((play) => {
        const key = proeKeys(play);
        return key[0] === down && key[1] === distance;
      }),
      baseline.filter((play) => proeKeys(play)[0] === down),
      baseline,
    ];
    const selected = candidates.find((candidate, index) =>
      candidate.length >= 50 || index === candidates.length - 1,
    )!;
    if (selected.length === 0) {
      throw new Error("Live metric oracle could not establish a PROE baseline.");
    }
    plays += group.length;
    actualPasses += group.filter((play) => play.kind === "dropback").length;
    expectedPasses +=
      selected.filter((play) => play.kind === "dropback").length /
      selected.length * group.length;
  }
  const actual = actualPasses / plays;
  const expected = expectedPasses / plays;
  return {
    actual_pass_pct: round(actual * 100, 1),
    expected_pass_pct: round(expected * 100, 1),
    difference_pp: round((actual - expected) * 100, 1),
  };
}

interface Counts {
  pass_attempts: number;
  carries: number;
  receptions: number;
  rushing_touchdowns: number;
  receiving_touchdowns: number;
}

function emptyCounts(): Counts {
  return {
    pass_attempts: 0,
    carries: 0,
    receptions: 0,
    rushing_touchdowns: 0,
    receiving_touchdowns: 0,
  };
}

function addCounts(left: Counts, right: Counts): Counts {
  return {
    pass_attempts: left.pass_attempts + right.pass_attempts,
    carries: left.carries + right.carries,
    receptions: left.receptions + right.receptions,
    rushing_touchdowns: left.rushing_touchdowns + right.rushing_touchdowns,
    receiving_touchdowns: left.receiving_touchdowns + right.receiving_touchdowns,
  };
}

function parseCount(value: string, attempts: boolean): number | undefined {
  const trimmed = value.trim();
  const parsedValue = attempts ? /^\d+\s*\/\s*(\d+)$/u.exec(trimmed)?.[1] ?? trimmed : trimmed;
  if (!/^\d+$/u.test(parsedValue)) return undefined;
  const parsed = Number(parsedValue);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function playerMetrics(
  rows: readonly GamePlayerStats[],
  team: string,
  gameIds: readonly number[],
): Array<Record<string, unknown>> {
  const identity = new Map<string, string>();
  const byPlayer = new Map<string, Map<number, Counts>>();
  const byTeam = new Map<number, Counts>();
  const fieldFor = (category: string, label: string): keyof Counts | undefined => {
    if (category === "passing" && (label === "att" || label === "c/att")) {
      return "pass_attempts";
    }
    if (category === "rushing" && (label === "att" || label === "car")) return "carries";
    if (category === "receiving" && label === "rec") return "receptions";
    if (category === "rushing" && label === "td") return "rushing_touchdowns";
    if (category === "receiving" && label === "td") return "receiving_touchdowns";
    return undefined;
  };
  for (const row of rows) {
    const teamRow = row.teams.find((candidate) => sameTeam(candidate.team, team));
    if (teamRow === undefined) continue;
    const teamCounts = byTeam.get(row.id) ?? emptyCounts();
    for (const categoryRow of teamRow.categories) {
      const category = categoryRow.name.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
      for (const type of categoryRow.types) {
        const label = type.name.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
        const field = fieldFor(category, label);
        if (field === undefined) continue;
        for (const athlete of type.athletes) {
          const value = parseCount(athlete.stat, field === "pass_attempts");
          if (value === undefined) continue;
          identity.set(athlete.id, athlete.name);
          const games = byPlayer.get(athlete.id) ?? new Map<number, Counts>();
          const counts = games.get(row.id) ?? emptyCounts();
          counts[field] += value;
          teamCounts[field] += value;
          games.set(row.id, counts);
          byPlayer.set(athlete.id, games);
        }
      }
    }
    byTeam.set(row.id, teamCounts);
  }
  const sumWindow = (
    ids: readonly number[],
    games: ReadonlyMap<number, Counts>,
  ): { player: Counts; team: Counts } => ({
    player: ids.reduce((sum, id) => addCounts(sum, games.get(id) ?? emptyCounts()), emptyCounts()),
    team: ids.reduce((sum, id) => addCounts(sum, byTeam.get(id) ?? emptyCounts()), emptyCounts()),
  });
  const stats = [...identity].map(([id, name]) => {
    const games = byPlayer.get(id) ?? new Map<number, Counts>();
    const season = sumWindow(gameIds, games);
    const lastFour = sumWindow(gameIds.slice(-4), games);
    const lastTwo = sumWindow(gameIds.slice(-2), games);
    const previousTwo = sumWindow(gameIds.slice(-4, -2), games);
    const opportunities = (counts: Counts) => counts.carries + counts.receptions;
    const shares = (window: { player: Counts; team: Counts }) => ({
      pass: window.player.pass_attempts / window.team.pass_attempts,
      carry: window.player.carries / window.team.carries,
      reception: window.player.receptions / window.team.receptions,
      opportunity: opportunities(window.player) / opportunities(window.team),
    });
    return {
      id,
      name,
      season,
      lastFour,
      lastTwo,
      previousTwo,
      seasonShares: shares(season),
      lastFourShares: shares(lastFour),
      lastTwoShares: shares(lastTwo),
      previousTwoShares: shares(previousTwo),
    };
  });
  const compareIds = (left: string, right: string) =>
    left.localeCompare(right, "en-US", { numeric: true });
  const passers = stats
    .filter((player) => player.season.player.pass_attempts > 0)
    .sort((left, right) =>
      right.season.player.pass_attempts - left.season.player.pass_attempts ||
      compareIds(left.id, right.id),
    )
    .slice(0, 2);
  const skills = stats
    .filter((player) =>
      player.season.player.carries + player.season.player.receptions > 0,
    )
    .sort((left, right) =>
      (right.lastFour.player.carries + right.lastFour.player.receptions) -
        (left.lastFour.player.carries + left.lastFour.player.receptions) ||
      compareIds(left.id, right.id),
    )
    .slice(0, 8);
  const passerIds = new Set(passers.map((player) => player.id));
  const skillIds = new Set(skills.map((player) => player.id));
  return [...passers, ...skills.filter((player) => !passerIds.has(player.id))].map((player) => {
    const roles = [
      ...(passerIds.has(player.id) ? ["passer"] : []),
      ...(skillIds.has(player.id) ? ["skill"] : []),
    ];
    const playerSeason = player.season.player;
    const playerLastFour = player.lastFour.player;
    const season: Record<string, number> = {};
    const last_four: Record<string, number> = {};
    const change: Record<string, number> = {};
    if (passerIds.has(player.id)) {
      season.pass_attempts = playerSeason.pass_attempts;
      season.pass_attempt_share_pct = round(player.seasonShares.pass * 100, 1);
      last_four.pass_attempts = playerLastFour.pass_attempts;
      last_four.pass_attempt_share_pct = round(player.lastFourShares.pass * 100, 1);
      change.pass_attempt_change =
        player.lastTwo.player.pass_attempts - player.previousTwo.player.pass_attempts;
      change.pass_attempt_share_change_pp = round(
        (player.lastTwoShares.pass - player.previousTwoShares.pass) * 100,
        1,
      );
    }
    if (skillIds.has(player.id)) {
      season.carries = playerSeason.carries;
      season.carry_share_pct = round(player.seasonShares.carry * 100, 1);
      season.receptions = playerSeason.receptions;
      season.reception_share_pct = round(player.seasonShares.reception * 100, 1);
      season.offensive_touchdowns =
        playerSeason.rushing_touchdowns + playerSeason.receiving_touchdowns;
      season.credited_opportunities =
        playerSeason.carries + playerSeason.receptions;
      season.opportunity_share_pct = round(player.seasonShares.opportunity * 100, 1);
      last_four.credited_opportunities =
        playerLastFour.carries + playerLastFour.receptions;
      last_four.opportunity_share_pct = round(
        player.lastFourShares.opportunity * 100,
        1,
      );
      change.opportunity_change =
        player.lastTwo.player.carries + player.lastTwo.player.receptions -
        player.previousTwo.player.carries - player.previousTwo.player.receptions;
      change.opportunity_share_change_pp = round(
        (player.lastTwoShares.opportunity - player.previousTwoShares.opportunity) * 100,
        1,
      );
    }
    return { id: player.id, name: player.name, roles, season, last_four, last_two_vs_previous_two: change };
  });
}

function weighted(values: readonly ValueWithSample[]): ValueWithSample {
  const usable = values.filter(
    (value): value is { value: number; sample: number } =>
      value.value !== undefined && value.sample > 0,
  );
  const sample = usable.reduce((sum, value) => sum + value.sample, 0);
  return sample === 0
    ? { sample: 0 }
    : {
        value: usable.reduce((sum, value) => sum + value.value * value.sample, 0) / sample,
        sample,
      };
}

function categoryValues(input: readonly OraclePlay[]): Record<Category, CategoryValues> {
  const all = input.filter(eligible);
  const passing = all.filter((play) => play.kind === "dropback");
  const rushing = all.filter((play) => play.kind === "rush");
  const metric = (value: number | undefined, sample: number): ValueWithSample =>
    value === undefined ? { sample } : { value, sample };
  const values = (plays: readonly OraclePlay[], ppaName: string, extra: Record<string, ValueWithSample>) => {
    const ppa = plays.flatMap(({ play }) => typeof play.ppa === "number" ? [play.ppa] : []);
    return {
      sample: plays.length,
      components: {
        [ppaName]: metric(mean(ppa), ppa.length),
        success_rate: metric(
          plays.length === 0 ? undefined : plays.filter(successful).length / plays.length,
          plays.length,
        ),
        explosive_rate: metric(
          plays.length === 0 ? undefined : plays.filter(explosive).length / plays.length,
          plays.length,
        ),
        ...extra,
      },
    };
  };
  return {
    overall: values(all, "ppa", {}),
    passing: values(passing, "ppa_per_dropback", {
      sack_rate: metric(
        passing.length === 0
          ? undefined
          : passing.filter((play) => play.sack).length / passing.length,
        passing.length,
      ),
    }),
    rushing: values(rushing, "ppa_per_rush", {
      stuff_rate: metric(
        rushing.length === 0
          ? undefined
          : rushing.filter(({ play }) => play.yardsGained <= 0).length / rushing.length,
        rushing.length,
      ),
    }),
  };
}

function standardDeviation(values: readonly number[]): number {
  const center = mean(values)!;
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length,
  );
}

function z(value: number, population: readonly number[], invert: boolean): number {
  const deviation = standardDeviation(population);
  const result = deviation === 0 ? 0 : (value - mean(population)!) / deviation;
  return invert ? -result : result;
}

function lowerIsBetter(unit: Unit, category: Category, component: string): boolean {
  if (unit === "offense") return component === "sack_rate" || component === "stuff_rate";
  if (category === "passing" && component === "sack_rate") return false;
  if (category === "rushing" && component === "stuff_rate") return false;
  return true;
}

function adjustedRanks(
  plays: readonly OraclePlay[],
  games: readonly Game[],
  targetTeam: string,
  classification: string,
): Record<string, unknown> {
  const grouped = new Map<string, OraclePlay[]>();
  for (const play of plays.filter(eligible)) {
    const key = `${play.play.gameId}\u0000${play.play.offense}\u0000${play.play.defense}`;
    const group = grouped.get(key) ?? [];
    group.push(play);
    grouped.set(key, group);
  }
  const rows: TeamGameUnit[] = [];
  for (const group of grouped.values()) {
    const first = group[0]!;
    const categories = categoryValues(group);
    rows.push({
      game_id: first.play.gameId,
      team: first.play.offense,
      opponent: first.play.defense,
      unit: "offense",
      categories,
    });
    rows.push({
      game_id: first.play.gameId,
      team: first.play.defense,
      opponent: first.play.offense,
      unit: "defense",
      categories,
    });
  }
  const peerTeams = new Set<string>();
  for (const game of games) {
    if (game.homeClassification === classification) peerTeams.add(game.homeTeam);
    if (game.awayClassification === classification) peerTeams.add(game.awayTeam);
  }
  const teams = [...peerTeams].sort((left, right) => left.localeCompare(right, "en-US"));
  const rankFor = (unit: Unit, category: Category): number => {
    const componentRows = teams.map((team) => {
      const teamRows = rows.filter((row) => row.team === team && row.unit === unit);
      const sample = teamRows.reduce((sum, row) => sum + row.categories[category].sample, 0);
      const weight = sample / (sample + (category === "overall" ? 200 : 100));
      const components = Object.fromEntries(COMPONENTS[category].map((component) => {
        const allUnit = rows.filter((row) => row.unit === unit);
        const league = weighted(allUnit.map((row) =>
          row.categories[category].components[component] ?? { sample: 0 },
        ));
        const adjustedGames = teamRows.flatMap((row) => {
          const actual = row.categories[category].components[component];
          if (actual?.value === undefined || actual.sample === 0 || league.value === undefined) {
            return [];
          }
          const opposite: Unit = unit === "offense" ? "defense" : "offense";
          const opponent = weighted(rows
            .filter((candidate) =>
              candidate.unit === opposite &&
              candidate.team === row.opponent &&
              candidate.opponent !== row.team,
            )
            .map((candidate) =>
              candidate.categories[category].components[component] ?? { sample: 0 },
            ));
          const baseline = opponent.value ?? league.value;
          return [{
            value: league.value + (actual.value - baseline),
            sample: actual.sample,
          }];
        });
        const adjusted = weighted(adjustedGames);
        const shrunk = adjusted.value === undefined || league.value === undefined
          ? undefined
          : league.value + (adjusted.value - league.value) * weight;
        return [component, shrunk];
      }));
      return { team, components };
    });
    const composites = componentRows.map((row) => {
      const scores = COMPONENTS[category].flatMap((component) => {
        const value = row.components[component] as number | undefined;
        const population = componentRows.flatMap((candidate) => {
          const candidateValue = candidate.components[component] as number | undefined;
          return candidateValue === undefined ? [] : [candidateValue];
        });
        return value === undefined
          ? []
          : [z(value, population, lowerIsBetter(unit, category, component))];
      });
      return { team: row.team, value: mean(scores) };
    });
    const usable = composites.filter(
      (row): row is { team: string; value: number } => row.value !== undefined,
    );
    const population = usable.map((row) => row.value);
    const ranked = usable
      .map((row) => ({ team: row.team, score: z(row.value, population, false) }))
      .sort((left, right) =>
        right.score - left.score || left.team.localeCompare(right.team, "en-US"),
      );
    const index = ranked.findIndex((row) => sameTeam(row.team, targetTeam));
    if (index < 0) throw new Error(`Live metric oracle could not rank ${targetTeam}.`);
    return index + 1;
  };
  return {
    peer_teams: peerTeams.size,
    offense: {
      overall_rank: rankFor("offense", "overall"),
      passing_rank: rankFor("offense", "passing"),
      rushing_rank: rankFor("offense", "rushing"),
    },
    defense: {
      overall_rank: rankFor("defense", "overall"),
      passing_rank: rankFor("defense", "passing"),
      rushing_rank: rankFor("defense", "rushing"),
    },
  };
}

export function buildLiveAnalysisOracle(options: {
  captured: CapturedAnalysisResponses;
  team: string;
  year: number;
  asOf: string;
  classification: string;
}): { games: Record<string, unknown>; analysis: Record<string, unknown> } {
  const schedule = rows<Game>(options.captured, "games");
  const cutoff = Date.parse(options.asOf);
  const scheduled = schedule.filter((game) =>
    sameTeam(game.homeTeam, options.team) || sameTeam(game.awayTeam, options.team),
  );
  const included = scheduled
    .filter((game) =>
      game.completed && Number.isFinite(Date.parse(game.startDate)) &&
      Date.parse(game.startDate) < cutoff,
    )
    .sort((left, right) =>
      Date.parse(left.startDate) - Date.parse(right.startDate) || left.id - right.id,
    );
  const gameIds = included.map((game) => game.id);
  const gameIdSet = new Set(gameIds);
  const weeks = new Set(included.map((game) => game.week));
  const eligibleLeagueGames = schedule.filter((game) =>
    game.completed && weeks.has(game.week) &&
    Number.isFinite(Date.parse(game.startDate)) && Date.parse(game.startDate) < cutoff,
  );
  const leagueIds = new Set(eligibleLeagueGames.map((game) => game.id));
  const league = rows<Play>(options.captured, "plays")
    .filter((play) => leagueIds.has(play.gameId))
    .map(classify);
  const teamPlays = league.filter((value) =>
    gameIdSet.has(value.play.gameId) &&
    (sameTeam(value.play.offense, options.team) || sameTeam(value.play.defense, options.team)),
  );
  const offense = teamPlays.filter((value) => sameTeam(value.play.offense, options.team));
  const defense = teamPlays.filter((value) => sameTeam(value.play.defense, options.team));
  const baseline = league.filter((value) =>
    !sameTeam(value.play.offense, options.team) &&
    !sameTeam(value.play.defense, options.team),
  );
  const drives = rows<Drive>(options.captured, "drives")
    .filter((drive) => gameIdSet.has(drive.gameId));
  const advanced = rows<AdvancedGameStat>(options.captured, "advancedGameStats")
    .filter((row) => gameIdSet.has(row.gameId) && sameTeam(row.team, options.team));
  const havoc = rows<GameHavocStats>(options.captured, "gameHavocStats")
    .filter((row) => gameIdSet.has(row.gameId) && sameTeam(row.team, options.team));
  const playerRows = rows<GamePlayerStats>(options.captured, "gamePlayerStats")
    .filter((row) => gameIdSet.has(row.id));
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const game of included) {
    const home = sameTeam(game.homeTeam, options.team);
    const teamPoints = home ? game.homePoints : game.awayPoints;
    const opponentPoints = home ? game.awayPoints : game.homePoints;
    if (typeof teamPoints !== "number" || typeof opponentPoints !== "number") {
      throw new Error("Live metric oracle encountered a completed game without scores.");
    }
    if (teamPoints > opponentPoints) wins += 1;
    else if (teamPoints < opponentPoints) losses += 1;
    else ties += 1;
  }
  return {
    games: {
      scheduled: scheduled.length,
      included: included.length,
      wins,
      losses,
      ties,
      ids: gameIds,
    },
    analysis: {
      offense: unitMetrics(offense, advanced, havoc, "offense"),
      defense_allowed: unitMetrics(defense, advanced, havoc, "defense"),
      drives: {
        offense: driveMetrics(
          drives.filter((drive) => sameTeam(drive.offense, options.team)),
          offense,
        ),
        defense_allowed: driveMetrics(
          drives.filter((drive) => sameTeam(drive.defense, options.team)),
          defense,
        ),
      },
      proe: {
        offense: aggregateProe(offense, baseline),
        defense_allowed: aggregateProe(defense, baseline),
      },
      players: playerMetrics(playerRows, options.team, gameIds),
      adjusted_strength: adjustedRanks(
        league,
        eligibleLeagueGames,
        options.team,
        options.classification,
      ),
    },
  };
}
