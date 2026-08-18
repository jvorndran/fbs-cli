import type {
  AdvancedGameStat,
  DivisionClassification,
  Drive,
  Game,
  GameHavocStats,
  GamePlayerStats,
  Play,
  PlayType,
  SeasonType,
} from "cfbd";

export type AnalysisSeasonType = SeasonType;
export type AnalysisClassification = DivisionClassification;

export interface TeamAnalysisOptions {
  year: number;
  team: string;
  asOf?: string;
  beforeGameId?: number;
  seasonType: AnalysisSeasonType;
  classification: AnalysisClassification;
}

export interface AnalysisSource<T> {
  query: Record<string, unknown>;
  rows: T;
}

export interface TeamAnalysisData {
  schedule: AnalysisSource<Game[]>;
  playTypes: AnalysisSource<PlayType[]>;
  weeklyPlays: Array<AnalysisSource<Play[]>>;
  drives: AnalysisSource<Drive[]>;
  playerStats: AnalysisSource<GamePlayerStats[]>;
  advancedStats: AnalysisSource<AdvancedGameStat[]>;
  havocStats: AnalysisSource<GameHavocStats[]>;
}

export interface RateMetric {
  value?: number;
  numerator: number;
  denominator: number;
  status?: "insufficient_sample";
}

export interface AverageMetric {
  value?: number;
  total: number;
  sample: number;
  status?: "insufficient_sample";
}

export interface SampleMetric {
  value?: number;
  sample: number;
  status?: "insufficient_sample";
}

export type AnalysisMetric = RateMetric | AverageMetric | SampleMetric;
