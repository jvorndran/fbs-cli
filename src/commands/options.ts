import { InvalidArgumentError, Option, type Command } from "commander";

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
