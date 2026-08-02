import { stringify } from "yaml";

import { removeNullishDeep } from "../utils/remove-nullish";
import { snakeCaseDeep } from "../utils/snake-case";
import { orderObject } from "../utils/stable-order";

export type AgentYamlEnvelope = {
  command: string;
  endpoint: string;
  query: Record<string, unknown>;
  count: number;
} & Record<string, unknown>;

function normalizeOutput(value: unknown): unknown {
  return removeNullishDeep(snakeCaseDeep(value));
}

export function renderYamlDocument(
  value: Record<string, unknown>,
  leadingKeys: readonly string[] = [],
): string {
  const normalized = normalizeOutput(value) as Record<string, unknown>;
  const ordered = orderObject(normalized, leadingKeys);
  const rendered = stringify(ordered, {
    aliasDuplicateObjects: false,
    lineWidth: 0,
    sortMapEntries: false,
  }).trimEnd();

  return `${rendered}\n`;
}

export function renderAgentYaml(envelope: AgentYamlEnvelope): string {
  return renderYamlDocument(envelope, ["command", "endpoint", "query", "count"]);
}

export function printAgentYaml(
  envelope: AgentYamlEnvelope,
  write: (value: string) => void = (value) => process.stdout.write(value),
): void {
  write(renderAgentYaml(envelope));
}
