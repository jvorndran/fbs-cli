import type { Command } from "commander";

import type { AuthService } from "../auth/service";
import { renderYamlDocument } from "../output/yaml";
import type { CommandRuntime } from "../runtime";

export function registerAuthCommand(
  program: Command,
  runtime: CommandRuntime,
  auth: AuthService,
): void {
  program
    .command("auth")
    .description("Create or update .env with a CFBD API key")
    .addHelpText(
      "after",
      "\nPaste the key at the hidden prompt. The command updates .env in the current directory and makes no CFBD request.\n\nExample:\n  fbs auth\n",
    )
    .action(async () => {
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
    })
    .allowExcessArguments(false);
}
