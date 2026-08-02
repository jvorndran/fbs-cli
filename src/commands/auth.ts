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
    .description("Save a CFBD API key for future commands")
    .addHelpText(
      "after",
      "\nPaste the key at the hidden prompt. No CFBD request is made.\n\nExample:\n  fbs auth\n",
    )
    .action(async () => {
      const result = await auth.saveCredential();
      runtime.io.stdout(
        renderYamlDocument(
          {
            command: "auth",
            status: "saved",
            credentialsFile: result.credentialsFile,
          },
          ["command", "status", "credentials_file"],
        ),
      );
    })
    .allowExcessArguments(false);
}
