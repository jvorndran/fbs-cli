import type { Game } from "cfbd";

import type { ClassifiedPlay } from "./play-classification";
import { isEligible } from "./play-classification";
import { isExplosive, isSuccessful } from "./metrics";

type Unit = "offense" | "defense";
type Category = "overall" | "passing" | "rushing";

interface ComponentValue {
  value?: number;
  sample: number;
}

interface CategoryValues {
  sample: number;
  components: Record<string, ComponentValue>;
}

interface TeamGameUnit {
  gameId: number;
  team: string;
  opponent: string;
  unit: Unit;
  categories: Record<Category, CategoryValues>;
}

interface AggregatedComponent {
  raw?: number;
  adjusted?: number;
  sample: number;
}

interface TeamCategory {
  team: string;
  unit: Unit;
  category: Category;
  sample: number;
  shrinkageWeight: number;
  opponentFallbackCount: number;
  components: Record<string, AggregatedComponent>;
}

export interface AdjustedStrengthValue {
  rawValue?: number;
  adjustedValue?: number;
  zScore?: number;
  rank?: number;
  population: number;
  sample: number;
  shrinkageWeight: number;
  opponentFallbackCount: number;
  status?: "insufficient_sample";
}

export interface AdjustedStrengthReport {
  method: {
    opponentAdjustment: "leave_one_opponent_out";
    overallPriorPlays: 200;
    passRushPriorPlays: 100;
    composite: "equal_weight_component_z_scores";
  };
  offense: Record<Category, AdjustedStrengthValue>;
  defense: Record<Category, AdjustedStrengthValue>;
}

const COMPONENTS: Record<Category, readonly string[]> = {
  overall: ["ppa", "success_rate", "explosive_rate"],
  passing: ["ppa_per_dropback", "success_rate", "explosive_rate", "sack_rate"],
  rushing: ["ppa_per_rush", "success_rate", "explosive_rate", "stuff_rate"],
};

function mean(values: readonly number[]): number | undefined {
  return values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedMean(
  values: readonly { value?: number; sample: number }[],
): { value?: number; sample: number } {
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

function component(value: number | undefined, sample: number): ComponentValue {
  return value === undefined || sample === 0 ? { sample } : { value, sample };
}

function valuesFor(plays: readonly ClassifiedPlay[]): Record<Category, CategoryValues> {
  const eligible = plays.filter(isEligible);
  const passing = eligible.filter((play) => play.kind === "dropback");
  const rushing = eligible.filter((play) => play.kind === "rush");
  const ppa = eligible.flatMap(({ play }) => play.ppa === null ? [] : [play.ppa]);
  const passPpa = passing.flatMap(({ play }) => play.ppa === null ? [] : [play.ppa]);
  const rushPpa = rushing.flatMap(({ play }) => play.ppa === null ? [] : [play.ppa]);
  const ratio = (numerator: number, denominator: number): number | undefined =>
    denominator === 0 ? undefined : numerator / denominator;

  return {
    overall: {
      sample: eligible.length,
      components: {
        ppa: component(mean(ppa), ppa.length),
        success_rate: component(
          ratio(eligible.filter(isSuccessful).length, eligible.length),
          eligible.length,
        ),
        explosive_rate: component(
          ratio(eligible.filter(isExplosive).length, eligible.length),
          eligible.length,
        ),
      },
    },
    passing: {
      sample: passing.length,
      components: {
        ppa_per_dropback: component(mean(passPpa), passPpa.length),
        success_rate: component(
          ratio(passing.filter(isSuccessful).length, passing.length),
          passing.length,
        ),
        explosive_rate: component(
          ratio(passing.filter(isExplosive).length, passing.length),
          passing.length,
        ),
        sack_rate: component(
          ratio(passing.filter((play) => play.sack).length, passing.length),
          passing.length,
        ),
      },
    },
    rushing: {
      sample: rushing.length,
      components: {
        ppa_per_rush: component(mean(rushPpa), rushPpa.length),
        success_rate: component(
          ratio(rushing.filter(isSuccessful).length, rushing.length),
          rushing.length,
        ),
        explosive_rate: component(
          ratio(rushing.filter(isExplosive).length, rushing.length),
          rushing.length,
        ),
        stuff_rate: component(
          ratio(rushing.filter(({ play }) => play.yardsGained <= 0).length, rushing.length),
          rushing.length,
        ),
      },
    },
  };
}

function buildRows(plays: readonly ClassifiedPlay[]): TeamGameUnit[] {
  const grouped = new Map<string, ClassifiedPlay[]>();
  for (const play of plays) {
    if (!isEligible(play)) continue;
    const key = `${play.play.gameId}\u0000${play.play.offense}\u0000${play.play.defense}`;
    const group = grouped.get(key) ?? [];
    group.push(play);
    grouped.set(key, group);
  }
  const rows: TeamGameUnit[] = [];
  for (const group of grouped.values()) {
    const first = group[0];
    if (first === undefined) continue;
    const categories = valuesFor(group);
    rows.push({
      gameId: first.play.gameId,
      team: first.play.offense,
      opponent: first.play.defense,
      unit: "offense",
      categories,
    });
    rows.push({
      gameId: first.play.gameId,
      team: first.play.defense,
      opponent: first.play.offense,
      unit: "defense",
      categories,
    });
  }
  return rows;
}

function leagueComponentMean(
  rows: readonly TeamGameUnit[],
  unit: Unit,
  category: Category,
  componentName: string,
): { value?: number; sample: number } {
  return weightedMean(
    rows
      .filter((row) => row.unit === unit)
      .map((row) => row.categories[category].components[componentName] ?? { sample: 0 }),
  );
}

function opponentBaseline(
  rows: readonly TeamGameUnit[],
  row: TeamGameUnit,
  category: Category,
  componentName: string,
): { value?: number; sample: number } {
  const opposite: Unit = row.unit === "offense" ? "defense" : "offense";
  return weightedMean(
    rows
      .filter((candidate) =>
        candidate.unit === opposite &&
        candidate.team === row.opponent &&
        candidate.opponent !== row.team,
      )
      .map((candidate) =>
        candidate.categories[category].components[componentName] ?? { sample: 0 },
      ),
  );
}

function aggregateTeamCategory(
  allRows: readonly TeamGameUnit[],
  team: string,
  unit: Unit,
  category: Category,
): TeamCategory {
  const rows = allRows.filter((row) => row.team === team && row.unit === unit);
  const prior = category === "overall" ? 200 : 100;
  const categorySample = rows.reduce((sum, row) => sum + row.categories[category].sample, 0);
  const shrinkageWeight = categorySample / (categorySample + prior);
  const fallbackGames = new Set<number>();
  const components: Record<string, AggregatedComponent> = {};

  for (const componentName of COMPONENTS[category]) {
    const league = leagueComponentMean(allRows, unit, category, componentName);
    const raw = weightedMean(
      rows.map((row) => row.categories[category].components[componentName] ?? { sample: 0 }),
    );
    const adjustedGames = rows.flatMap((row) => {
      const actual = row.categories[category].components[componentName];
      if (actual?.value === undefined || actual.sample === 0) return [];
      const opponent = opponentBaseline(allRows, row, category, componentName);
      const baseline = opponent.value ?? league.value;
      if (opponent.value === undefined) fallbackGames.add(row.gameId);
      if (baseline === undefined || league.value === undefined) return [];
      return [{
        value: league.value + (actual.value - baseline),
        sample: actual.sample,
      }];
    });
    const adjusted = weightedMean(adjustedGames);
    const shrunk = adjusted.value === undefined || league.value === undefined
      ? undefined
      : league.value + (adjusted.value - league.value) * shrinkageWeight;
    components[componentName] = {
      ...(raw.value === undefined ? {} : { raw: raw.value }),
      ...(shrunk === undefined ? {} : { adjusted: shrunk }),
      sample: raw.sample,
    };
  }

  return {
    team,
    unit,
    category,
    sample: categorySample,
    shrinkageWeight,
    opponentFallbackCount: fallbackGames.size,
    components,
  };
}

function lowerIsBetter(unit: Unit, category: Category, componentName: string): boolean {
  if (unit === "offense") {
    return componentName === "sack_rate" || componentName === "stuff_rate";
  }
  if (category === "passing" && componentName === "sack_rate") return false;
  if (category === "rushing" && componentName === "stuff_rate") return false;
  return true;
}

function standardDeviation(values: readonly number[]): number {
  const center = mean(values);
  if (center === undefined) return 0;
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length,
  );
}

function zScore(
  value: number | undefined,
  population: readonly number[],
  invert: boolean,
): number | undefined {
  if (value === undefined || population.length === 0) return undefined;
  const center = mean(population);
  const deviation = standardDeviation(population);
  if (center === undefined) return undefined;
  if (deviation === 0) return 0;
  const z = (value - center) / deviation;
  return invert ? -z : z;
}

interface CompositeRow extends TeamCategory {
  rawValue?: number;
  adjustedValue?: number;
  zScore?: number;
  rank?: number;
}

function composites(categories: TeamCategory[]): CompositeRow[] {
  const preliminary = categories.map<CompositeRow>((row) => {
    const rawZ: number[] = [];
    const adjustedZ: number[] = [];
    for (const componentName of COMPONENTS[row.category]) {
      const peers = categories.filter((candidate) =>
        candidate.unit === row.unit && candidate.category === row.category,
      );
      const rawPopulation = peers.flatMap((peer) => {
        const value = peer.components[componentName]?.raw;
        return value === undefined ? [] : [value];
      });
      const adjustedPopulation = peers.flatMap((peer) => {
        const value = peer.components[componentName]?.adjusted;
        return value === undefined ? [] : [value];
      });
      const invert = lowerIsBetter(row.unit, row.category, componentName);
      const raw = zScore(row.components[componentName]?.raw, rawPopulation, invert);
      const adjusted = zScore(
        row.components[componentName]?.adjusted,
        adjustedPopulation,
        invert,
      );
      if (raw !== undefined) rawZ.push(raw);
      if (adjusted !== undefined) adjustedZ.push(adjusted);
    }
    const rawValue = mean(rawZ);
    const adjustedValue = mean(adjustedZ);
    return {
      ...row,
      ...(rawValue === undefined ? {} : { rawValue }),
      ...(adjustedValue === undefined ? {} : { adjustedValue }),
    };
  });

  for (const unit of ["offense", "defense"] as const) {
    for (const category of ["overall", "passing", "rushing"] as const) {
      const peers = preliminary.filter((row) => row.unit === unit && row.category === category);
      const population = peers.flatMap((row) =>
        row.adjustedValue === undefined ? [] : [row.adjustedValue],
      );
      for (const row of peers) {
        const score = zScore(row.adjustedValue, population, false);
        if (score !== undefined) row.zScore = score;
      }
      const ranked = peers
        .filter((row): row is typeof row & { zScore: number } => row.zScore !== undefined)
        .sort((left, right) =>
          right.zScore - left.zScore || left.team.localeCompare(right.team, "en-US"),
        );
      ranked.forEach((row, index) => { row.rank = index + 1; });
    }
  }
  return preliminary;
}

function sameTeam(left: string, right: string): boolean {
  return left.localeCompare(right, "en-US", { sensitivity: "base" }) === 0;
}

export function calculateAdjustedStrength(
  plays: readonly ClassifiedPlay[],
  eligibleGames: readonly Game[],
  targetTeam: string,
  classification: string,
): AdjustedStrengthReport {
  const allRows = buildRows(plays);
  const peerTeams = new Set<string>();
  for (const game of eligibleGames) {
    if (game.homeClassification === classification) peerTeams.add(game.homeTeam);
    if (game.awayClassification === classification) peerTeams.add(game.awayTeam);
  }
  if (![...peerTeams].some((team) => sameTeam(team, targetTeam))) {
    peerTeams.add(targetTeam);
  }

  const aggregated: TeamCategory[] = [];
  for (const team of [...peerTeams].sort((left, right) => left.localeCompare(right, "en-US"))) {
    for (const unit of ["offense", "defense"] as const) {
      for (const category of ["overall", "passing", "rushing"] as const) {
        aggregated.push(aggregateTeamCategory(allRows, team, unit, category));
      }
    }
  }
  const rows = composites(aggregated);
  const population = peerTeams.size;
  const reportFor = (unit: Unit, category: Category): AdjustedStrengthValue => {
    const row = rows.find((candidate) =>
      candidate.unit === unit &&
      candidate.category === category &&
      sameTeam(candidate.team, targetTeam),
    );
    if (row === undefined || row.sample === 0) {
      return {
        population,
        sample: 0,
        shrinkageWeight: 0,
        opponentFallbackCount: 0,
        status: "insufficient_sample",
      };
    }
    return {
      ...(row.rawValue === undefined ? {} : { rawValue: row.rawValue }),
      ...(row.adjustedValue === undefined ? {} : { adjustedValue: row.adjustedValue }),
      ...(row.zScore === undefined ? {} : { zScore: row.zScore }),
      ...(row.rank === undefined ? {} : { rank: row.rank }),
      population,
      sample: row.sample,
      shrinkageWeight: row.shrinkageWeight,
      opponentFallbackCount: row.opponentFallbackCount,
      ...(row.adjustedValue === undefined ? { status: "insufficient_sample" as const } : {}),
    };
  };

  return {
    method: {
      opponentAdjustment: "leave_one_opponent_out",
      overallPriorPlays: 200,
      passRushPriorPlays: 100,
      composite: "equal_weight_component_z_scores",
    },
    offense: {
      overall: reportFor("offense", "overall"),
      passing: reportFor("offense", "passing"),
      rushing: reportFor("offense", "rushing"),
    },
    defense: {
      overall: reportFor("defense", "overall"),
      passing: reportFor("defense", "passing"),
      rushing: reportFor("defense", "rushing"),
    },
  };
}
