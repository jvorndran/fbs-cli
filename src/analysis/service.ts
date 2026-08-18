import type {
  AdvancedGameStat,
  Drive,
  Game,
  GameHavocStats,
  GamePlayerStats,
  Play,
  PlayType,
} from "cfbd";

import type { CfbdApi } from "../cfbd/api";
import type { CommandRuntime } from "../runtime";
import { DEFAULT_MAX_OUTPUT_CHARS } from "../config";
import {
  asCliError,
  CliError,
  InvalidAnalysisCutoffError,
  NoCompletedAnalysisGamesError,
  OutputTooLargeError,
  UnknownAnalysisTeamError,
} from "../errors";
import { renderAnalysisYaml } from "../output/analysis";
import type { AnalysisSource, TeamAnalysisData, TeamAnalysisOptions } from "./types";
import { buildTeamAnalysisEnvelope } from "./report";

function sameTeam(left: string, right: string): boolean {
  return left.localeCompare(right, "en-US", { sensitivity: "base" }) === 0;
}

function sourceFailure(
  error: unknown,
  publicQuery: Record<string, unknown>,
  endpoint: string,
  sourceQuery: Record<string, unknown>,
): CliError {
  const normalized = asCliError(error);
  if (normalized.code === "missing_api_key") return normalized;
  return new CliError({
    code: normalized.code,
    message: normalized.message,
    ...(normalized.status === undefined ? {} : { status: normalized.status }),
    command: "analyze team",
    query: publicQuery,
    ...(normalized.hint === undefined ? {} : { hint: normalized.hint }),
    exitCode: normalized.exitCode,
    metadata: {
      ...(normalized.metadata ?? {}),
      sourceEndpoint: endpoint,
      sourceQuery,
    },
    cause: normalized.cause,
  });
}

async function fetchSource<T extends readonly unknown[]>(
  endpoint: string,
  query: Record<string, unknown>,
  publicQuery: Record<string, unknown>,
  request: () => Promise<T>,
): Promise<AnalysisSource<T>> {
  try {
    const rows = await request();
    return { query, rows };
  } catch (error) {
    throw sourceFailure(error, publicQuery, endpoint, query);
  }
}

async function mapLimit<T, R>(
  values: readonly T[],
  limit: number,
  operation: (value: T) => Promise<R>,
  shouldStop: () => boolean = () => false,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let cursor = 0;
  let stopped = false;
  async function worker(): Promise<void> {
    while (!stopped && !shouldStop()) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      try {
        results[index] = await operation(values[index]!);
      } catch (error) {
        stopped = true;
        throw error;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

function canonicalTeam(
  schedule: readonly Game[],
  requested: string,
  classification: string,
): string | undefined {
  for (const game of schedule) {
    if (sameTeam(game.homeTeam, requested) && game.homeClassification === classification) {
      return game.homeTeam;
    }
    if (sameTeam(game.awayTeam, requested) && game.awayClassification === classification) {
      return game.awayTeam;
    }
  }
  return undefined;
}

function resolveCutoff(
  options: TeamAnalysisOptions,
  schedule: readonly Game[],
  team: string,
  invocationStart: Date,
): Date {
  if (options.asOf !== undefined && options.beforeGameId !== undefined) {
    throw new InvalidAnalysisCutoffError(
      "--as-of and --before-game-id cannot be used together.",
      "Supply exactly one cutoff option.",
    );
  }
  if (options.beforeGameId !== undefined) {
    const target = schedule.find((game) => game.id === options.beforeGameId);
    if (target === undefined) {
      throw new InvalidAnalysisCutoffError(
        `Game ${options.beforeGameId} was not found in the selected season schedule.`,
        "Verify --year, --season-type, --classification, and --before-game-id.",
      );
    }
    if (!sameTeam(target.homeTeam, team) && !sameTeam(target.awayTeam, team)) {
      throw new InvalidAnalysisCutoffError(
        `Game ${options.beforeGameId} does not include ${team}.`,
        "Choose a target game involving the analyzed team.",
      );
    }
    const timestamp = Date.parse(target.startDate);
    if (!Number.isFinite(timestamp)) {
      throw new InvalidAnalysisCutoffError(
        `Game ${options.beforeGameId} does not have a valid kickoff timestamp.`,
      );
    }
    return new Date(timestamp);
  }
  if (options.asOf !== undefined) return new Date(options.asOf);
  return invocationStart;
}

function isBefore(game: Game, cutoff: Date): boolean {
  const timestamp = Date.parse(game.startDate);
  return game.completed && Number.isFinite(timestamp) && timestamp < cutoff.getTime();
}

async function acquireData(
  api: CfbdApi,
  options: TeamAnalysisOptions,
  publicQuery: Record<string, unknown>,
  schedule: AnalysisSource<Game[]>,
  team: string,
  weeks: readonly number[],
): Promise<Omit<TeamAnalysisData, "schedule">> {
  let sourceFailed = false;
  async function fetchRequired<T extends readonly unknown[]>(
    endpoint: string,
    query: Record<string, unknown>,
    request: () => Promise<T>,
  ): Promise<AnalysisSource<T>> {
    try {
      return await fetchSource(endpoint, query, publicQuery, request);
    } catch (error) {
      sourceFailed = true;
      throw error;
    }
  }
  const commonTeamQuery = {
    year: options.year,
    team,
    seasonType: options.seasonType,
  };
  const weeklyPromise = mapLimit(weeks, 3, (week) => {
    const query = {
      year: options.year,
      week,
      seasonType: options.seasonType,
      classification: options.classification,
    };
    return fetchRequired<Play[]>(
      "/plays",
      query,
      () => api.plays(query),
    );
  }, () => sourceFailed);

  const [playTypes, weeklyPlays, drives, playerStats, advancedStats, havocStats] =
    await Promise.all([
      fetchRequired<PlayType[]>("/plays/types", {}, () => api.playTypes()),
      weeklyPromise,
      fetchRequired<Drive[]>(
        "/drives",
        { ...commonTeamQuery, classification: options.classification },
        () => api.drives({ ...commonTeamQuery, classification: options.classification }),
      ),
      fetchRequired<GamePlayerStats[]>(
        "/games/players",
        { ...commonTeamQuery, classification: options.classification },
        () => api.gamePlayerStats({
          ...commonTeamQuery,
          classification: options.classification,
        }),
      ),
      fetchRequired<AdvancedGameStat[]>(
        "/stats/game/advanced",
        commonTeamQuery,
        () => api.advancedGameStats(commonTeamQuery),
      ),
      fetchRequired<GameHavocStats[]>(
        "/stats/game/havoc",
        commonTeamQuery,
        () => api.gameHavocStats(commonTeamQuery),
      ),
    ]);

  return { playTypes, weeklyPlays, drives, playerStats, advancedStats, havocStats };
}

export async function runTeamAnalysis(
  runtime: CommandRuntime,
  options: TeamAnalysisOptions,
  publicQuery: Record<string, unknown>,
  invocationStart = new Date(),
): Promise<void> {
  try {
    const maxOutputCharsOrPromise =
      runtime.getMaxOutputChars?.() ?? DEFAULT_MAX_OUTPUT_CHARS;
    const maxOutputChars = maxOutputCharsOrPromise instanceof Promise
      ? await maxOutputCharsOrPromise
      : maxOutputCharsOrPromise;
    const apiOrPromise = runtime.getApi();
    const api = apiOrPromise instanceof Promise ? await apiOrPromise : apiOrPromise;
    const scheduleQuery = {
      year: options.year,
      seasonType: options.seasonType,
      classification: options.classification,
    };
    const schedule = await fetchSource<Game[]>(
      "/games",
      scheduleQuery,
      publicQuery,
      () => api.games(scheduleQuery),
    );
    const team = canonicalTeam(schedule.rows, options.team, options.classification);
    if (team === undefined) throw new UnknownAnalysisTeamError(options.team, options.year);
    const cutoff = resolveCutoff(options, schedule.rows, team, invocationStart);
    const scheduledTeamGames = schedule.rows.filter((game) =>
      sameTeam(game.homeTeam, team) || sameTeam(game.awayTeam, team),
    );
    const eligibleLeagueGames = schedule.rows.filter((game) => isBefore(game, cutoff));
    const includedTeamGames = scheduledTeamGames.filter((game) => isBefore(game, cutoff));
    if (includedTeamGames.length === 0) {
      throw new NoCompletedAnalysisGamesError(
        team,
        cutoff.toISOString(),
        scheduledTeamGames.length,
      );
    }
    const weeks = [...new Set(includedTeamGames.map((game) => game.week))].sort(
      (left, right) => left - right,
    );
    const acquired = await acquireData(
      api,
      options,
      publicQuery,
      schedule,
      team,
      weeks,
    );
    const envelope = buildTeamAnalysisEnvelope({
      options,
      effectiveAsOf: cutoff.toISOString(),
      canonicalTeam: team,
      eligibleLeagueGames,
      scheduledTeamGames,
      includedTeamGames,
      data: { schedule, ...acquired },
    });
    const rendered = renderAnalysisYaml(envelope);
    const outputCharacters = Array.from(rendered).length;
    if (maxOutputChars !== 0 && outputCharacters > maxOutputChars) {
      throw new OutputTooLargeError({
        command: "analyze team",
        query: publicQuery,
        outputCharacters,
        maxOutputCharacters: maxOutputChars,
      });
    }
    runtime.io.stdout(rendered);
  } catch (error) {
    throw asCliError(error).withContext("analyze team", publicQuery);
  }
}
