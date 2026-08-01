import { stringify } from "yaml";

import type { CliError } from "../errors";
import { redactSensitive } from "../errors";
import { removeNullishDeep } from "../utils/remove-nullish";
import { snakeCaseDeep } from "../utils/snake-case";

export function renderErrorYaml(error: CliError): string {
  const envelope = {
    error: {
      code: error.code,
      status: error.status,
      message: redactSensitive(error.message),
      command: error.command,
      query: error.query,
      hint: error.hint,
    },
  };

  const rendered = stringify(removeNullishDeep(snakeCaseDeep(envelope)), {
    aliasDuplicateObjects: false,
    lineWidth: 0,
    sortMapEntries: false,
  }).trimEnd();

  return `${rendered}\n`;
}

export function printErrorYaml(
  error: CliError,
  write: (value: string) => void = (value) => process.stderr.write(value),
): void {
  write(renderErrorYaml(error));
}
