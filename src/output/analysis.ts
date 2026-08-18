import { renderYamlDocument } from "./yaml";

export type AnalysisYamlEnvelope = {
  team: string;
  year: number;
  seasonType?: string;
  classification?: string;
  asOf: string;
  games: Record<string, unknown>;
  warnings?: Array<Record<string, unknown>>;
  analysis: Record<string, unknown>;
};

export function renderAnalysisYaml(envelope: AnalysisYamlEnvelope): string {
  return renderYamlDocument(envelope, [
    "team",
    "year",
    "season_type",
    "classification",
    "as_of",
    "games",
    "warnings",
    "analysis",
  ]);
}
