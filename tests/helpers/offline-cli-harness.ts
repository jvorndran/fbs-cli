import { runCli } from "../../src/index.ts";
import { createMockApi } from "./mock-api.ts";

const mock = await createMockApi();

process.exitCode = await runCli(process.argv.slice(2), {
  api: mock.api,
  environment: {},
});
