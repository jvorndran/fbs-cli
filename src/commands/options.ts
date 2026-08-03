import { InvalidArgumentError, Option, type Command } from "commander";

import { CliError } from "../errors";

const SEASON_TYPES = [
  "regular",
  "postseason",
  "both",
  "allstar",
  "spring_regular",
  "spring_postseason",
] as const;
const CLASSIFICATIONS = ["fbs", "fcs", "ii", "iii"] as const;
const PLAYOFF_ROUNDS = [
  "first_round",
  "quarterfinal",
  "semifinal",
  "championship",
] as const;

export function parseInteger(value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new InvalidArgumentError("Expected an integer.");
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError("Expected a safe integer.");
  }

  return parsed;
}

export function addSeasonTypeOption(command: Command): Command {
  return command.addOption(
    new Option("--season-type <value>", "Season type").choices([...SEASON_TYPES]),
  );
}

export function addClassificationOption(command: Command): Command {
  return command.addOption(
    new Option("--classification <value>", "Division classification").choices([
      ...CLASSIFICATIONS,
    ]),
  );
}

export function addPlayoffOptions(command: Command): Command {
  command.addOption(
    new Option("--competition <value>", "Playoff competition").choices(["cfp"]),
  );
  command.addOption(
    new Option("--round <value>", "Playoff round; requires --competition").choices([
      ...PLAYOFF_ROUNDS,
    ]),
  );
  return command;
}

export function suppliedOptions<T extends object>(
  command: Command,
  optionalBooleanNames: readonly string[] = [],
): T {
  const options = { ...command.opts<T>() } as T & Record<string, unknown>;

  for (const name of optionalBooleanNames) {
    if (command.getOptionValueSource(name) !== "cli") {
      delete options[name];
    }
  }

  return options;
}

function commandPath(command: Command): string {
  const parts: string[] = [];
  let current: Command | null = command;

  while (current !== null && current.parent !== null) {
    parts.unshift(current.name());
    current = current.parent;
  }

  return parts.join(" ");
}

/**
 * Collect options for an endpoint command which is nested below another
 * executable endpoint. Explicitly supplied ancestor options are inherited
 * only when the leaf exposes the same option; leaf values take precedence.
 */
export function suppliedLeafOptions<T extends object>(
  command: Command,
  optionalBooleanNames: readonly string[] = [],
): T {
  const options: Record<string, unknown> = {
    ...(suppliedOptions<T>(command, optionalBooleanNames) as Record<
      string,
      unknown
    >),
  };
  const supportedNames = new Set(
    command.options.map((option) => option.attributeName()),
  );
  const leafCliNames = new Set(
    command.options
      .map((option) => option.attributeName())
      .filter((name) => command.getOptionValueSource(name) === "cli"),
  );
  const inheritedNames = new Set<string>();
  const path = commandPath(command);

  for (
    let ancestor = command.parent;
    ancestor !== null;
    ancestor = ancestor.parent
  ) {
    for (const option of ancestor.options) {
      const name = option.attributeName();
      if (ancestor.getOptionValueSource(name) !== "cli") continue;

      if (!supportedNames.has(name)) {
        const flag = option.long ?? option.flags;
        throw new CliError({
          code: "cli_parse_error",
          message: `Option ${flag} is not supported by ${path}.`,
          command: path,
          hint: `Run fbs ${path} --help and place endpoint filters after the full command path.`,
          exitCode: 2,
        });
      }

      if (leafCliNames.has(name) || inheritedNames.has(name)) continue;
      options[name] = ancestor.getOptionValue(name);
      inheritedNames.add(name);
    }
  }

  return options as T;
}
