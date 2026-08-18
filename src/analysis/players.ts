import type { GamePlayerStats } from "cfbd";

import type { RateMetric } from "./types";
import { rateMetric } from "./metrics";

interface PlayerGameCounts {
  passAttempts: number;
  carries: number;
  receptions: number;
  rushingTouchdowns: number;
  receivingTouchdowns: number;
}

interface PlayerIdentity {
  id: string;
  name: string;
}

export interface PlayerWindow {
  games: number;
  passAttempts: number;
  passAttemptShare: RateMetric;
  carries: number;
  carryShare: RateMetric;
  receptions: number;
  receptionShare: RateMetric;
  offensiveTouchdowns: number;
  offensiveTouchdownShare: RateMetric;
  creditedOpportunities: number;
  creditedOpportunityShare: RateMetric;
}

export interface PlayerRoleReport extends PlayerIdentity {
  seasonToDate: PlayerWindow;
  lastTwo: PlayerWindow;
  lastFour: PlayerWindow;
  previousTwo: PlayerWindow;
  lastTwoMinusPreviousTwo: {
    passAttempts: number;
    passAttemptShare: number | undefined;
    carries: number;
    carryShare: number | undefined;
    receptions: number;
    receptionShare: number | undefined;
    offensiveTouchdowns: number;
    offensiveTouchdownShare: number | undefined;
    creditedOpportunities: number;
    creditedOpportunityShare: number | undefined;
  };
}

export interface PlayerRoleResult {
  players: PlayerRoleReport[];
  unmappedLabels: string[];
  mappedValues: number;
  includedBoxScoreGames: number;
}

export interface SelectedPlayerRole extends PlayerRoleReport {
  roles: Array<"passer" | "skill">;
}

function comparePlayerIds(left: string, right: string): number {
  return left.localeCompare(right, "en-US", { numeric: true });
}

export function selectPlayerRoles(
  players: readonly PlayerRoleReport[],
): SelectedPlayerRole[] {
  const passers = players
    .filter((player) => player.seasonToDate.passAttempts > 0)
    .slice()
    .sort((left, right) =>
      right.seasonToDate.passAttempts - left.seasonToDate.passAttempts ||
      comparePlayerIds(left.id, right.id),
    )
    .slice(0, 2);
  const skills = players
    .filter((player) => player.seasonToDate.creditedOpportunities > 0)
    .slice()
    .sort((left, right) =>
      right.lastFour.creditedOpportunities - left.lastFour.creditedOpportunities ||
      comparePlayerIds(left.id, right.id),
    )
    .slice(0, 8);
  const passerIds = new Set(passers.map((player) => player.id));
  const skillIds = new Set(skills.map((player) => player.id));

  return [...passers, ...skills.filter((player) => !passerIds.has(player.id))].map(
    (player) => ({
      ...player,
      roles: [
        ...(passerIds.has(player.id) ? ["passer" as const] : []),
        ...(skillIds.has(player.id) ? ["skill" as const] : []),
      ],
    }),
  );
}

function key(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function parseNonnegative(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseAttempts(value: string): number | undefined {
  const trimmed = value.trim();
  const slash = /^\d+\s*\/\s*(\d+)$/.exec(trimmed);
  return slash === null ? parseNonnegative(trimmed) : Number(slash[1]);
}

function emptyCounts(): PlayerGameCounts {
  return {
    passAttempts: 0,
    carries: 0,
    receptions: 0,
    rushingTouchdowns: 0,
    receivingTouchdowns: 0,
  };
}

const IGNORED: Record<string, ReadonlySet<string>> = {
  passing: new Set(["yds", "avg", "td", "int", "long", "qbr", "sacks"]),
  rushing: new Set(["yds", "avg", "long"]),
  receiving: new Set(["yds", "avg", "long", "tgts"]),
};
const IGNORED_CATEGORIES = new Set([
  "defensive",
  "fumbles",
  "interceptions",
  "kick returns",
  "kickreturns",
  "kicking",
  "miscellaneous",
  "punt returns",
  "puntreturns",
  "punting",
]);

function mappedField(
  category: string,
  label: string,
): keyof PlayerGameCounts | "ignored" | undefined {
  if (category === "passing" && (label === "c/att" || label === "att")) {
    return "passAttempts";
  }
  if (category === "rushing" && (label === "car" || label === "att")) {
    return "carries";
  }
  if (category === "receiving" && label === "rec") return "receptions";
  if (category === "rushing" && label === "td") return "rushingTouchdowns";
  if (category === "receiving" && label === "td") return "receivingTouchdowns";
  if (IGNORED[category]?.has(label) === true) return "ignored";
  return undefined;
}

function sumCounts(values: readonly PlayerGameCounts[]): PlayerGameCounts {
  return values.reduce((sum, value) => ({
    passAttempts: sum.passAttempts + value.passAttempts,
    carries: sum.carries + value.carries,
    receptions: sum.receptions + value.receptions,
    rushingTouchdowns: sum.rushingTouchdowns + value.rushingTouchdowns,
    receivingTouchdowns: sum.receivingTouchdowns + value.receivingTouchdowns,
  }), emptyCounts());
}

function windowFor(
  ids: readonly number[],
  playerGames: ReadonlyMap<number, PlayerGameCounts>,
  teamGames: ReadonlyMap<number, PlayerGameCounts>,
): PlayerWindow {
  const player = sumCounts(ids.map((id) => playerGames.get(id) ?? emptyCounts()));
  const team = sumCounts(ids.map((id) => teamGames.get(id) ?? emptyCounts()));
  const playerTouchdowns = player.rushingTouchdowns + player.receivingTouchdowns;
  const teamTouchdowns = team.rushingTouchdowns + team.receivingTouchdowns;
  const playerOpportunities = player.carries + player.receptions;
  const teamOpportunities = team.carries + team.receptions;
  return {
    games: ids.length,
    passAttempts: player.passAttempts,
    passAttemptShare: rateMetric(player.passAttempts, team.passAttempts),
    carries: player.carries,
    carryShare: rateMetric(player.carries, team.carries),
    receptions: player.receptions,
    receptionShare: rateMetric(player.receptions, team.receptions),
    offensiveTouchdowns: playerTouchdowns,
    offensiveTouchdownShare: rateMetric(playerTouchdowns, teamTouchdowns),
    creditedOpportunities: playerOpportunities,
    creditedOpportunityShare: rateMetric(playerOpportunities, teamOpportunities),
  };
}

function shareDelta(left: RateMetric, right: RateMetric): number | undefined {
  return left.value === undefined || right.value === undefined
    ? undefined
    : left.value - right.value;
}

export function analyzePlayerRoles(
  rows: readonly GamePlayerStats[],
  team: string,
  orderedGameIds: readonly number[],
): PlayerRoleResult {
  const identities = new Map<string, PlayerIdentity>();
  const gamesByPlayer = new Map<string, Map<number, PlayerGameCounts>>();
  const teamGames = new Map<number, PlayerGameCounts>();
  const unmapped = new Set<string>();
  let mappedValues = 0;
  const includedGames = new Set<number>();

  for (const row of rows) {
    const teamRow = row.teams.find((candidate) =>
      candidate.team.localeCompare(team, "en-US", { sensitivity: "base" }) === 0,
    );
    if (teamRow === undefined) continue;
    includedGames.add(row.id);
    const gameTeamCounts = teamGames.get(row.id) ?? emptyCounts();
    for (const categoryRow of teamRow.categories) {
      const category = key(categoryRow.name);
      if (IGNORED_CATEGORIES.has(category)) continue;
      for (const type of categoryRow.types) {
        const label = key(type.name);
        const field = mappedField(category, label);
        if (field === undefined) {
          unmapped.add(`${categoryRow.name}:${type.name}`);
          continue;
        }
        if (field === "ignored") continue;
        for (const athlete of type.athletes) {
          const parsed = field === "passAttempts"
            ? parseAttempts(athlete.stat)
            : parseNonnegative(athlete.stat);
          if (parsed === undefined) {
            unmapped.add(`${categoryRow.name}:${type.name}:${athlete.stat}`);
            continue;
          }
          mappedValues += 1;
          identities.set(athlete.id, { id: athlete.id, name: athlete.name });
          const playerGames = gamesByPlayer.get(athlete.id) ?? new Map();
          const counts = playerGames.get(row.id) ?? emptyCounts();
          counts[field] += parsed;
          gameTeamCounts[field] += parsed;
          playerGames.set(row.id, counts);
          gamesByPlayer.set(athlete.id, playerGames);
        }
      }
    }
    teamGames.set(row.id, gameTeamCounts);
  }

  const season = [...orderedGameIds];
  const lastTwoIds = season.slice(-2);
  const lastFourIds = season.slice(-4);
  const previousTwoIds = season.slice(-4, -2);
  const players = [...identities.values()].map((identity) => {
    const games = gamesByPlayer.get(identity.id) ?? new Map();
    const seasonToDate = windowFor(season, games, teamGames);
    const lastTwo = windowFor(lastTwoIds, games, teamGames);
    const lastFour = windowFor(lastFourIds, games, teamGames);
    const previousTwo = windowFor(previousTwoIds, games, teamGames);
    return {
      ...identity,
      seasonToDate,
      lastTwo,
      lastFour,
      previousTwo,
      lastTwoMinusPreviousTwo: {
        passAttempts: lastTwo.passAttempts - previousTwo.passAttempts,
        passAttemptShare: shareDelta(lastTwo.passAttemptShare, previousTwo.passAttemptShare),
        carries: lastTwo.carries - previousTwo.carries,
        carryShare: shareDelta(lastTwo.carryShare, previousTwo.carryShare),
        receptions: lastTwo.receptions - previousTwo.receptions,
        receptionShare: shareDelta(lastTwo.receptionShare, previousTwo.receptionShare),
        offensiveTouchdowns:
          lastTwo.offensiveTouchdowns - previousTwo.offensiveTouchdowns,
        offensiveTouchdownShare: shareDelta(
          lastTwo.offensiveTouchdownShare,
          previousTwo.offensiveTouchdownShare,
        ),
        creditedOpportunities:
          lastTwo.creditedOpportunities - previousTwo.creditedOpportunities,
        creditedOpportunityShare: shareDelta(
          lastTwo.creditedOpportunityShare,
          previousTwo.creditedOpportunityShare,
        ),
      },
    } satisfies PlayerRoleReport;
  });

  players.sort((left, right) =>
    right.lastFour.creditedOpportunities - left.lastFour.creditedOpportunities ||
    comparePlayerIds(left.id, right.id),
  );
  return {
    players,
    unmappedLabels: [...unmapped].sort((left, right) => left.localeCompare(right, "en-US")),
    mappedValues,
    includedBoxScoreGames: includedGames.size,
  };
}
