import type { Command } from "commander";

import type { AuthService } from "../auth/service";
import { asCliError } from "../errors";
import { renderYamlDocument } from "../output/yaml";
import type { CommandRuntime } from "../runtime";

export function registerAuthCommand(
  program: Command,
  runtime: CommandRuntime,
  auth: AuthService,
): void {
  program
    .command("auth")
    .description("Validate a CFBD API key and save it to .env")
    .addHelpText(
      "after",
      "\nPaste the key at the hidden prompt. The command validates it with one GET /info request, then updates .env in the current directory.\n\nExample:\n  fbs auth\n",
    )
    .action(async () => {
      try {
        const result = await auth.saveCredential();
        runtime.io.stdout(
          renderYamlDocument(
            {
              command: "auth",
              status: "saved",
              envFile: result.environmentFile,
            },
            ["command", "status", "env_file"],
          ),
        );
      } catch (error) {
        throw asCliError(error).withContext("auth");
      }
    })
    .allowExcessArguments(false);
}
