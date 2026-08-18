import type { AdvancedGameStat, Game, GameHavocStats } from "cfbd";

import type { AnalysisYamlEnvelope } from "../output/analysis";
import { calculateAdjustedStrength } from "./adjustment";
import { analyzeDrives, type DriveAnalysis } from "./drives";
import {
  aggregateHavoc,
  aggregateLineYards,
  aggregatePlayMetrics,
  type PlayMetricReport,
} from "./metrics";
import {
  isEligible,
  classifyPlay,
  providerTaxonomyChanges,
  unclassifiedPlayTypes,
  type ClassifiedPlay,
} from "./play-classification";
import {
  analyzePlayerRoles,
  selectPlayerRoles,
  type PlayerRoleReport,
  type PlayerWindow,
} from "./players";
import { calculateAggregateProe, type AggregateProe } from "./situations";
import type {
  AnalysisMetric,
  RateMetric,
  TeamAnalysisData,
  TeamAnalysisOptions,
} from "./types";

interface AnalysisWarning {
  [key: string]: unknown;
  code: string;
  count?: number;
}

function sameTeam(left: string, right: string): boolean {
  return left.localeCompare(right, "en-US", { sensitivity: "base" }) === 0;
}

function gameDate(game: Game): number {
  return Date.parse(game.startDate);
}

function orderedGames(games: readonly Game[]): Game[] {
  return [...games].sort(
    (left, right) => gameDate(left) - gameDate(right) || left.id - right.id,
  );
}

export function roundAnalysisValue(value: number, digits: number): number {
  const shiftDecimal = (input: number, places: number): number => {
    const [coefficient, exponent = "0"] = input.toString().split("e");
    return Number(`${coefficient}e${Number(exponent) + places}`);
  };
  const rounded = Math.sign(value) *
    shiftDecimal(Math.round(shiftDecimal(Math.abs(value), digits)), -digits);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function compact(
  value: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

function missingGameIds(
  gameIds: readonly number[],
  presentIds: ReadonlySet<number>,
): number[] {
  return gameIds.filter((id) => !presentIds.has(id));
}

function rowsForTeam<T extends { team: string }>(
  rows: readonly T[],
  team: string,
): T[] {
  return rows.filter((row) => sameTeam(row.team, team));
}

function addWarning(
  warnings: AnalysisWarning[],
  code: string,
  count: number,
): void {
  if (count > 0) warnings.push({ code, count });
}

function markUnavailable(
  unavailable: Set<string>,
  path: string,
  available: boolean,
): boolean {
  if (available) return true;
  unavailable.add(path);
  return false;
}

function percentage(
  metric: RateMetric | undefined,
  path: string,
  unavailable: Set<string>,
  sourceAvailable = true,
): number | undefined {
  if (!markUnavailable(
    unavailable,
    path,
    sourceAvailable && metric?.value !== undefined,
  )) return undefined;
  return roundAnalysisValue(metric!.value! * 100, 1);
}

function decimal(
  metric: AnalysisMetric | undefined,
  path: string,
  unavailable: Set<string>,
  digits: number,
  sourceAvailable = true,
): number | undefined {
  if (!markUnavailable(
    unavailable,
    path,
    sourceAvailable && metric?.value !== undefined,
  )) return undefined;
  return roundAnalysisValue(metric!.value!, digits);
}

function numeric(
  value: number | undefined,
  path: string,
  unavailable: Set<string>,
  digits: number,
  sourceAvailable = true,
): number | undefined {
  if (!markUnavailable(
    unavailable,
    path,
    sourceAvailable && value !== undefined,
  )) return undefined;
  return roundAnalysisValue(value!, digits);
}

function unitReport(input: {
  plays: readonly ClassifiedPlay[];
  advanced: readonly AdvancedGameStat[];
  havoc: readonly GameHavocStats[];
  side: "offense" | "defense";
  path: "analysis.offense" | "analysis.defense_allowed";
  playsComplete: boolean;
  advancedComplete: boolean;
  havocComplete: boolean;
  unavailable: Set<string>;
}): Record<string, unknown> {
  const metrics: PlayMetricReport = aggregatePlayMetrics(input.plays);
  const advancedGameIds = new Set(input.advanced.map((row) => row.gameId));
  const coveredRushes = input.plays.filter(
    (play) => play.kind === "rush" && advancedGameIds.has(play.play.gameId),
  ).length;
  const lineYards = aggregateLineYards(input.advanced, input.side, coveredRushes);
  const havoc = aggregateHavoc(input.havoc, input.side);
  const passingPath = `${input.path}.passing`;
  const rushingPath = `${input.path}.rushing`;
  const havocKey = input.side === "offense" ? "havoc_allowed" : "havoc_created";
  const havocPath = `${input.path}.${havocKey}`;
  const passing = compact({
    successPct: percentage(
      metrics.passing.successRate,
      `${passingPath}.success_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    positivePpaPct: percentage(
      metrics.passing.positivePpaRate,
      `${passingPath}.positive_ppa_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    ppaPerDropback: decimal(
      metrics.passing.ppaPerDropback,
      `${passingPath}.ppa_per_dropback`,
      input.unavailable,
      3,
      input.playsComplete,
    ),
    explosivePct: percentage(
      metrics.passing.explosiveRate,
      `${passingPath}.explosive_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    sackPct: percentage(
      metrics.passing.sackRate,
      `${passingPath}.sack_pct`,
      input.unavailable,
      input.playsComplete,
    ),
  });
  const rushing = compact({
    successPct: percentage(
      metrics.rushing.successRate,
      `${rushingPath}.success_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    positivePpaPct: percentage(
      metrics.rushing.positivePpaRate,
      `${rushingPath}.positive_ppa_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    ppaPerRush: decimal(
      metrics.rushing.ppaPerRush,
      `${rushingPath}.ppa_per_rush`,
      input.unavailable,
      3,
      input.playsComplete,
    ),
    explosivePct: percentage(
      metrics.rushing.explosiveRate,
      `${rushingPath}.explosive_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    stuffPct: percentage(
      metrics.rushing.stuffRate,
      `${rushingPath}.stuff_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    powerSuccessPct: percentage(
      metrics.rushing.powerSuccess,
      `${rushingPath}.power_success_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    lineYardsPerRush: decimal(
      lineYards,
      `${rushingPath}.line_yards_per_rush`,
      input.unavailable,
      2,
      input.advancedComplete,
    ),
  });
  const havocReport = compact({
    defensiveBackPct: percentage(
      havoc.db,
      `${havocPath}.defensive_back_pct`,
      input.unavailable,
      input.havocComplete,
    ),
    frontSevenPct: percentage(
      havoc.frontSeven,
      `${havocPath}.front_seven_pct`,
      input.unavailable,
      input.havocComplete,
    ),
    totalPct: percentage(
      havoc.total,
      `${havocPath}.total_pct`,
      input.unavailable,
      input.havocComplete,
    ),
  });

  return compact({
    earlyDownPassPct: percentage(
      metrics.earlyDownPassRate,
      `${input.path}.early_down_pass_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    successPct: percentage(
      metrics.successRate,
      `${input.path}.success_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    positivePpaPct: percentage(
      metrics.positivePpaRate,
      `${input.path}.positive_ppa_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    ppaPerPlay: decimal(
      metrics.ppaPerPlay,
      `${input.path}.ppa_per_play`,
      input.unavailable,
      3,
      input.playsComplete,
    ),
    explosivePct: percentage(
      metrics.explosivePlayRate,
      `${input.path}.explosive_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    negativePlayPct: percentage(
      metrics.negativePlayRate,
      `${input.path}.negative_play_pct`,
      input.unavailable,
      input.playsComplete,
    ),
    passing,
    rushing,
    [havocKey]: havocReport,
  }) ?? {};
}

function driveReport(
  report: DriveAnalysis,
  path: string,
  unavailable: Set<string>,
  sourceComplete: boolean,
): Record<string, unknown> | undefined {
  return compact({
    pointsPerDrive: decimal(
      report.pointsPerDrive,
      `${path}.points_per_drive`,
      unavailable,
      2,
      sourceComplete,
    ),
    touchdownPct: percentage(
      report.touchdownDriveRate,
      `${path}.touchdown_pct`,
      unavailable,
      sourceComplete,
    ),
    emptyDrivePct: percentage(
      report.emptyDriveRate,
      `${path}.empty_drive_pct`,
      unavailable,
      sourceComplete,
    ),
    threeAndOutPct: percentage(
      report.threeAndOutRate,
      `${path}.three_and_out_pct`,
      unavailable,
      sourceComplete,
    ),
    scoringOpportunityPct: percentage(
      report.scoringOpportunityRate,
      `${path}.scoring_opportunity_pct`,
      unavailable,
      sourceComplete,
    ),
    pointsPerScoringOpportunity: decimal(
      report.pointsPerScoringOpportunity,
      `${path}.points_per_scoring_opportunity`,
      unavailable,
      2,
      sourceComplete,
    ),
    availableYardsPct: percentage(
      report.availableYardsPercentage,
      `${path}.available_yards_pct`,
      unavailable,
      sourceComplete,
    ),
  });
}

function proeReport(
  report: AggregateProe,
  path: string,
  unavailable: Set<string>,
  sourceComplete: boolean,
): Record<string, unknown> | undefined {
  return compact({
    actualPassPct: numeric(
      report.actualPassRate === undefined ? undefined : report.actualPassRate * 100,
      `${path}.actual_pass_pct`,
      unavailable,
      1,
      sourceComplete,
    ),
    expectedPassPct: numeric(
      report.expectedPassRate === undefined ? undefined : report.expectedPassRate * 100,
      `${path}.expected_pass_pct`,
      unavailable,
      1,
      sourceComplete,
    ),
    differencePp: numeric(
      report.difference === undefined ? undefined : report.difference * 100,
      `${path}.difference_pp`,
      unavailable,
      1,
      sourceComplete,
    ),
  });
}

function playerShare(
  metric: RateMetric,
  path: string,
  unavailable: Set<string>,
): number | undefined {
  return percentage(metric, path, unavailable);
}

function seasonPlayerWindow(
  player: PlayerRoleReport,
  roles: readonly ("passer" | "skill")[],
  unavailable: Set<string>,
): Record<string, unknown> {
  const window = player.seasonToDate;
  const path = `analysis.players.${player.id}.season`;
  return compact({
    ...(roles.includes("passer") ? {
      passAttempts: window.passAttempts,
      passAttemptSharePct: playerShare(
        window.passAttemptShare,
        `${path}.pass_attempt_share_pct`,
        unavailable,
      ),
    } : {}),
    ...(roles.includes("skill") ? {
      carries: window.carries,
      carrySharePct: playerShare(
        window.carryShare,
        `${path}.carry_share_pct`,
        unavailable,
      ),
      receptions: window.receptions,
      receptionSharePct: playerShare(
        window.receptionShare,
        `${path}.reception_share_pct`,
        unavailable,
      ),
      offensiveTouchdowns: window.offensiveTouchdowns,
      creditedOpportunities: window.creditedOpportunities,
      opportunitySharePct: playerShare(
        window.creditedOpportunityShare,
        `${path}.opportunity_share_pct`,
        unavailable,
      ),
    } : {}),
  }) ?? {};
}

function recentPlayerWindow(
  player: PlayerRoleReport,
  roles: readonly ("passer" | "skill")[],
  unavailable: Set<string>,
): Record<string, unknown> {
  const window: PlayerWindow = player.lastFour;
  const path = `analysis.players.${player.id}.last_four`;
  return compact({
    ...(roles.includes("passer") ? {
      passAttempts: window.passAttempts,
      passAttemptSharePct: playerShare(
        window.passAttemptShare,
        `${path}.pass_attempt_share_pct`,
        unavailable,
      ),
    } : {}),
    ...(roles.includes("skill") ? {
      creditedOpportunities: window.creditedOpportunities,
      opportunitySharePct: playerShare(
        window.creditedOpportunityShare,
        `${path}.opportunity_share_pct`,
        unavailable,
      ),
    } : {}),
  }) ?? {};
}

function playerChange(
  player: PlayerRoleReport,
  roles: readonly ("passer" | "skill")[],
  unavailable: Set<string>,
): Record<string, unknown> {
  const change = player.lastTwoMinusPreviousTwo;
  const path = `analysis.players.${player.id}.last_two_vs_previous_two`;
  return compact({
    ...(roles.includes("passer") ? {
      passAttemptChange: change.passAttempts,
      passAttemptShareChangePp: numeric(
        change.passAttemptShare === undefined
          ? undefined
          : change.passAttemptShare * 100,
        `${path}.pass_attempt_share_change_pp`,
        unavailable,
        1,
      ),
    } : {}),
    ...(roles.includes("skill") ? {
      opportunityChange: change.creditedOpportunities,
      opportunityShareChangePp: numeric(
        change.creditedOpportunityShare === undefined
          ? undefined
          : change.creditedOpportunityShare * 100,
        `${path}.opportunity_share_change_pp`,
        unavailable,
        1,
      ),
    } : {}),
  }) ?? {};
}

function playerReport(
  players: readonly PlayerRoleReport[],
  unavailable: Set<string>,
): Array<Record<string, unknown>> {
  return selectPlayerRoles(players).map((player) => ({
    id: player.id,
    name: player.name,
    roles: player.roles,
    season: seasonPlayerWindow(player, player.roles, unavailable),
    lastFour: recentPlayerWindow(player, player.roles, unavailable),
    lastTwoVsPreviousTwo: playerChange(player, player.roles, unavailable),
  }));
}

function recordFor(
  games: readonly Game[],
  team: string,
): { wins: number; losses: number; ties: number } | undefined {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  for (const game of games) {
    const home = sameTeam(game.homeTeam, team);
    const teamPoints = home ? game.homePoints : game.awayPoints;
    const opponentPoints = home ? game.awayPoints : game.homePoints;
    if (
      typeof teamPoints !== "number" || !Number.isFinite(teamPoints) ||
      typeof opponentPoints !== "number" || !Number.isFinite(opponentPoints)
    ) return undefined;
    if (teamPoints > opponentPoints) wins += 1;
    else if (teamPoints < opponentPoints) losses += 1;
    else ties += 1;
  }
  return { wins, losses, ties };
}

export function buildTeamAnalysisEnvelope(input: {
  options: TeamAnalysisOptions;
  effectiveAsOf: string;
  canonicalTeam: string;
  eligibleLeagueGames: readonly Game[];
  scheduledTeamGames: readonly Game[];
  includedTeamGames: readonly Game[];
  data: TeamAnalysisData;
}): AnalysisYamlEnvelope {
  const games = orderedGames(input.includedTeamGames);
  const gameIds = games.map((game) => game.id);
  const gameIdSet = new Set(gameIds);
  const fetchedWeeks = new Set(
    input.data.weeklyPlays.map((source) => Number(source.query.week)),
  );
  const fetchedLeagueGames = input.eligibleLeagueGames.filter((game) =>
    fetchedWeeks.has(game.week),
  );
  const leagueGameIds = new Set(fetchedLeagueGames.map((game) => game.id));
  const rawLeaguePlays = input.data.weeklyPlays
    .flatMap((source) => source.rows)
    .filter((play) => leagueGameIds.has(play.gameId));
  const classifiedLeague = rawLeaguePlays.map(classifyPlay);
  const teamPlays = classifiedLeague.filter((play) =>
    gameIdSet.has(play.play.gameId) &&
    (sameTeam(play.play.offense, input.canonicalTeam) ||
      sameTeam(play.play.defense, input.canonicalTeam)),
  );
  const offensePlays = teamPlays.filter((play) =>
    sameTeam(play.play.offense, input.canonicalTeam),
  );
  const defensePlays = teamPlays.filter((play) =>
    sameTeam(play.play.defense, input.canonicalTeam),
  );
  const baseline = classifiedLeague.filter((play) =>
    !sameTeam(play.play.offense, input.canonicalTeam) &&
    !sameTeam(play.play.defense, input.canonicalTeam),
  );
  const drives = input.data.drives.rows.filter((drive) => gameIdSet.has(drive.gameId));
  const offenseDrives = drives.filter((drive) =>
    sameTeam(drive.offense, input.canonicalTeam),
  );
  const defenseDrives = drives.filter((drive) =>
    sameTeam(drive.defense, input.canonicalTeam),
  );
  const advanced = rowsForTeam(
    input.data.advancedStats.rows.filter((row) => gameIdSet.has(row.gameId)),
    input.canonicalTeam,
  );
  const havoc = rowsForTeam(
    input.data.havocStats.rows.filter((row) => gameIdSet.has(row.gameId)),
    input.canonicalTeam,
  );
  const playerRows = input.data.playerStats.rows.filter((row) => gameIdSet.has(row.id));
  const playerRoles = analyzePlayerRoles(playerRows, input.canonicalTeam, gameIds);
  const offenseDriveAnalysis = analyzeDrives(offenseDrives, offensePlays);
  const defenseDriveAnalysis = analyzeDrives(defenseDrives, defensePlays);
  const adjustedStrength = calculateAdjustedStrength(
    classifiedLeague,
    fetchedLeagueGames,
    input.canonicalTeam,
    input.options.classification,
  );

  const presentOffensePlayGameIds = new Set(
    offensePlays.map((play) => play.play.gameId),
  );
  const presentDefensePlayGameIds = new Set(
    defensePlays.map((play) => play.play.gameId),
  );
  const completeLeaguePlayGameIds = new Set(
    fetchedLeagueGames.flatMap((game) => {
      const gamePlays = rawLeaguePlays.filter((play) => play.gameId === game.id);
      const homeOffense = gamePlays.some((play) => sameTeam(play.offense, game.homeTeam));
      const awayOffense = gamePlays.some((play) => sameTeam(play.offense, game.awayTeam));
      return homeOffense && awayOffense ? [game.id] : [];
    }),
  );
  const presentOffenseDriveGameIds = new Set(
    offenseDrives.map((drive) => drive.gameId),
  );
  const presentDefenseDriveGameIds = new Set(
    defenseDrives.map((drive) => drive.gameId),
  );
  const presentPlayerGameIds = new Set(
    playerRows.flatMap((row) =>
      row.teams.some((team) => sameTeam(team.team, input.canonicalTeam)) ? [row.id] : [],
    ),
  );
  const presentAdvancedGameIds = new Set(advanced.map((row) => row.gameId));
  const presentHavocGameIds = new Set(havoc.map((row) => row.gameId));
  const missingOffensePlays = missingGameIds(gameIds, presentOffensePlayGameIds);
  const missingDefensePlays = missingGameIds(gameIds, presentDefensePlayGameIds);
  const missingTeamPlays = [...new Set([
    ...missingOffensePlays,
    ...missingDefensePlays,
  ])];
  const missingLeaguePlays = missingGameIds(
    [...leagueGameIds],
    completeLeaguePlayGameIds,
  );
  const missingOffenseDrives = missingGameIds(gameIds, presentOffenseDriveGameIds);
  const missingDefenseDrives = missingGameIds(gameIds, presentDefenseDriveGameIds);
  const missingDrives = [...new Set([
    ...missingOffenseDrives,
    ...missingDefenseDrives,
  ])];
  const missingPlayers = missingGameIds(gameIds, presentPlayerGameIds);
  const missingAdvanced = missingGameIds(gameIds, presentAdvancedGameIds);
  const missingHavoc = missingGameIds(gameIds, presentHavocGameIds);
  const scoreMissing = games.filter((game) =>
    typeof game.homePoints !== "number" || !Number.isFinite(game.homePoints) ||
    typeof game.awayPoints !== "number" || !Number.isFinite(game.awayPoints),
  ).length;
  const missingPpa = classifiedLeague.filter(
    (play) => isEligible(play) && play.play.ppa === null,
  ).length;
  const unclassified = unclassifiedPlayTypes(classifiedLeague).reduce(
    (sum, value) => sum + value.count,
    0,
  );
  const taxonomyChanges = providerTaxonomyChanges(input.data.playTypes.rows).length;
  const opponentFallbacks = [
    ...Object.values(adjustedStrength.offense),
    ...Object.values(adjustedStrength.defense),
  ].reduce((sum, value) => sum + value.opponentFallbackCount, 0);
  const warnings: AnalysisWarning[] = [];
  addWarning(warnings, "league_plays_missing_ppa", missingPpa);
  addWarning(warnings, "completed_games_missing_scores", scoreMissing);
  addWarning(warnings, "team_plays_missing_games", missingTeamPlays.length);
  addWarning(warnings, "league_plays_missing_games", missingLeaguePlays.length);
  addWarning(warnings, "drives_missing_games", missingDrives.length);
  addWarning(warnings, "player_stats_missing_games", missingPlayers.length);
  addWarning(warnings, "advanced_stats_missing_games", missingAdvanced.length);
  addWarning(warnings, "havoc_stats_missing_games", missingHavoc.length);
  addWarning(warnings, "league_plays_unclassified", unclassified);
  addWarning(warnings, "provider_play_types_unclassified", taxonomyChanges);
  addWarning(warnings, "player_stats_unmapped", playerRoles.unmappedLabels.length);
  if (opponentFallbacks > 0) {
    warnings.push({ code: "opponent_adjustment_fallbacks" });
  }

  const unavailable = new Set<string>();
  const offensePlaysComplete = missingOffensePlays.length === 0;
  const defensePlaysComplete = missingDefensePlays.length === 0;
  const leaguePlaysComplete = missingLeaguePlays.length === 0;
  const offense = unitReport({
    plays: offensePlays,
    advanced,
    havoc,
    side: "offense",
    path: "analysis.offense",
    playsComplete: offensePlaysComplete,
    advancedComplete: missingAdvanced.length === 0,
    havocComplete: missingHavoc.length === 0,
    unavailable,
  });
  const defenseAllowed = unitReport({
    plays: defensePlays,
    advanced,
    havoc,
    side: "defense",
    path: "analysis.defense_allowed",
    playsComplete: defensePlaysComplete,
    advancedComplete: missingAdvanced.length === 0,
    havocComplete: missingHavoc.length === 0,
    unavailable,
  });
  const offenseProe = calculateAggregateProe(offensePlays, baseline);
  const defenseProe = calculateAggregateProe(defensePlays, baseline);
  const offenseProeComplete = offensePlaysComplete && leaguePlaysComplete;
  const defenseProeComplete = defensePlaysComplete && leaguePlaysComplete;
  const offenseRankPath = "analysis.adjusted_strength.offense";
  const defenseRankPath = "analysis.adjusted_strength.defense";
  const rank = (
    value: number | undefined,
    path: string,
  ): number | undefined => numeric(
    value,
    path,
    unavailable,
    0,
    leaguePlaysComplete,
  );
  const record = recordFor(games, input.canonicalTeam);
  const analysis = {
    offense,
    defenseAllowed,
    drives: compact({
      offense: driveReport(
        offenseDriveAnalysis,
        "analysis.drives.offense",
        unavailable,
        missingOffenseDrives.length === 0 && offensePlaysComplete,
      ),
      defenseAllowed: driveReport(
        defenseDriveAnalysis,
        "analysis.drives.defense_allowed",
        unavailable,
        missingDefenseDrives.length === 0 && defensePlaysComplete,
      ),
    }),
    proe: compact({
      offense: proeReport(
        offenseProe,
        "analysis.proe.offense",
        unavailable,
        offenseProeComplete,
      ),
      defenseAllowed: proeReport(
        defenseProe,
        "analysis.proe.defense_allowed",
        unavailable,
        defenseProeComplete,
      ),
    }),
    players: markUnavailable(
      unavailable,
      "analysis.players",
      missingPlayers.length === 0,
    ) ? playerReport(playerRoles.players, unavailable) : undefined,
    adjustedStrength: compact({
      peerTeams: adjustedStrength.offense.overall.population,
      offense: compact({
        overallRank: rank(
          adjustedStrength.offense.overall.rank,
          `${offenseRankPath}.overall_rank`,
        ),
        passingRank: rank(
          adjustedStrength.offense.passing.rank,
          `${offenseRankPath}.passing_rank`,
        ),
        rushingRank: rank(
          adjustedStrength.offense.rushing.rank,
          `${offenseRankPath}.rushing_rank`,
        ),
      }),
      defense: compact({
        overallRank: rank(
          adjustedStrength.defense.overall.rank,
          `${defenseRankPath}.overall_rank`,
        ),
        passingRank: rank(
          adjustedStrength.defense.passing.rank,
          `${defenseRankPath}.passing_rank`,
        ),
        rushingRank: rank(
          adjustedStrength.defense.rushing.rank,
          `${defenseRankPath}.rushing_rank`,
        ),
      }),
    }),
  } as Record<string, unknown>;
  if (unavailable.size > 0) {
    analysis.unavailableMetrics = [...unavailable].sort((left, right) =>
      left.localeCompare(right, "en-US"),
    );
  }

  return {
    team: input.canonicalTeam,
    year: input.options.year,
    ...(input.options.seasonType === "both"
      ? {}
      : { seasonType: input.options.seasonType }),
    ...(input.options.classification === "fbs"
      ? {}
      : { classification: input.options.classification }),
    asOf: input.effectiveAsOf,
    games: {
      scheduled: input.scheduledTeamGames.length,
      included: games.length,
      ...(record ?? {}),
      ids: gameIds,
    },
    ...(warnings.length === 0 ? {} : { warnings }),
    analysis,
  };
}
