import type { AuthService } from "./auth/service";
import type { Environment } from "./config";
import { resolveCredential } from "./config";
import type { CfbdApi } from "./cfbd/api";
import { createCfbdApi } from "./cfbd/api";
import { asCliError } from "./errors";
import { printAgentYaml } from "./output/yaml";

export interface CliIo {
  stdout(value: string): void;
  stderr(value: string): void;
}

export interface RuntimeOptions {
  api?: CfbdApi;
  auth?: AuthService;
  environment?: Environment;
  environmentFile?: string;
  workingDirectory?: string;
  io?: Partial<CliIo>;
}

export interface CommandRuntime {
  getApi(): CfbdApi | Promise<CfbdApi>;
  io: CliIo;
}

const defaultIo: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

export function createCommandRuntime(options: RuntimeOptions = {}): CommandRuntime {
  let api = options.api;
  let apiPromise: Promise<CfbdApi> | undefined;
  const environment = options.environment ?? process.env;
  const io: CliIo = {
    stdout: options.io?.stdout ?? defaultIo.stdout,
    stderr: options.io?.stderr ?? defaultIo.stderr,
  };

  return {
    io,
    getApi(): CfbdApi | Promise<CfbdApi> {
      if (api !== undefined) return api;

      apiPromise ??= resolveCredential({
        environment,
        ...(options.environmentFile === undefined
          ? {}
          : { environmentFile: options.environmentFile }),
        ...(options.workingDirectory === undefined
          ? {}
          : { workingDirectory: options.workingDirectory }),
      }).then(({ apiKey }) => createCfbdApi(apiKey));

      return apiPromise.then(
        (resolvedApi) => {
          api = resolvedApi;
          return resolvedApi;
        },
        (error: unknown) => {
          apiPromise = undefined;
          throw error;
        },
      );
    },
  };
}

export interface EndpointExecution<TResponse, TOutput> {
  command: string;
  endpoint: string;
  query: Record<string, unknown>;
  resultKey: string;
  request(api: CfbdApi): Promise<TResponse>;
  transform(response: TResponse): TOutput;
  count?(response: TResponse, output: TOutput): number;
}

function defaultCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return value === null || value === undefined ? 0 : 1;
}

export async function runEndpoint<TResponse, TOutput>(
  runtime: CommandRuntime,
  execution: EndpointExecution<TResponse, TOutput>,
): Promise<void> {
  try {
    const apiOrPromise = runtime.getApi();
    const api =
      apiOrPromise instanceof Promise ? await apiOrPromise : apiOrPromise;
    const response = await execution.request(api);
    const output = execution.transform(response);
    const count = execution.count?.(response, output) ?? defaultCount(response);

    printAgentYaml(
      {
        command: execution.command,
        endpoint: execution.endpoint,
        query: execution.query,
        count,
        [execution.resultKey]: output,
      },
      runtime.io.stdout,
    );
  } catch (error) {
    throw asCliError(error).withContext(execution.command, execution.query);
  }
}
