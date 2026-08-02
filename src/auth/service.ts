import { emitKeypressEvents, type Key } from "node:readline";

import {
  AuthCancelledError,
  AuthInputRequiredError,
  InvalidAuthKeyError,
} from "../errors";
import { createCfbdApi } from "../cfbd/api";
import {
  AUTH_KEY_MAX_LENGTH,
  normalizeAuthApiKey,
  saveCredential,
  type SavedCredential,
} from "./env-file";

export interface AuthService {
  saveCredential(): Promise<SavedCredential>;
}

export interface CreateAuthServiceOptions {
  environmentFile?: string;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WriteStream;
  validateApiKey?: AuthApiKeyValidator;
}

export type AuthApiKeyValidator = (apiKey: string) => Promise<void>;

type PipedInput = AsyncIterable<string | Uint8Array>;

const AUTH_INTERACTIVE_PROMPT =
  "This will validate your key with one CFBD GET /info request.\n" +
  "If valid, it will save the key to .env in the current directory.\n" +
  "Your key will stay hidden while you type.\n\n" +
  "CFBD API key: ";

export async function readPipedAuthApiKey(input: PipedInput): Promise<string> {
  let value = "";
  for await (const chunk of input) {
    const text =
      typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    if (value.length + text.length > AUTH_KEY_MAX_LENGTH + 2) {
      throw new InvalidAuthKeyError();
    }
    value += text;
  }
  return normalizeAuthApiKey(value);
}

function readMaskedAuthApiKey(
  input: NodeJS.ReadStream,
  output: NodeJS.WriteStream,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = "";
    let settled = false;
    const initialRawMode = input.isRaw ?? false;

    const cleanup = (): void => {
      input.off("keypress", onKeypress);
      input.off("end", onEnd);
      input.off("error", onError);
      try {
        input.setRawMode(initialRawMode);
      } catch {
        // The stream may already be closed; promise settlement still wins.
      }
      if (!initialRawMode) {
        try {
          input.pause();
        } catch {
          // The stream may already be closed; promise settlement still wins.
        }
      }
    };

    const finish = (operation: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        output.write("\n");
      } catch {
        // Do not let terminal output failures prevent promise settlement.
      }
      operation();
    };

    const onEnd = (): void => {
      finish(() => reject(new AuthInputRequiredError()));
    };

    const onError = (): void => {
      finish(() => reject(new AuthInputRequiredError()));
    };

    function onKeypress(character: string, key: Key): void {
      if (key.ctrl && key.name === "c") {
        finish(() => reject(new AuthCancelledError()));
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        finish(() => {
          try {
            resolve(normalizeAuthApiKey(value));
          } catch (error) {
            reject(error);
          }
        });
        return;
      }

      if (key.name === "backspace") {
        value = Array.from(value).slice(0, -1).join("");
        return;
      }

      if (
        character.length > 0 &&
        !key.ctrl &&
        !key.meta &&
        !/[\u0000-\u001f\u007f]/u.test(character)
      ) {
        value += character;
        if (value.length > AUTH_KEY_MAX_LENGTH) {
          finish(() => reject(new InvalidAuthKeyError()));
        }
      }
    }

    output.write(AUTH_INTERACTIVE_PROMPT);
    emitKeypressEvents(input);
    input.on("keypress", onKeypress);
    input.once("end", onEnd);
    input.once("error", onError);
    try {
      input.setRawMode(true);
      input.resume();
    } catch {
      finish(() => reject(new AuthInputRequiredError()));
    }
  });
}

export async function readAuthApiKey(
  input: NodeJS.ReadStream = process.stdin,
  output: NodeJS.WriteStream = process.stderr,
): Promise<string> {
  if (input.isTTY && output.isTTY && typeof input.setRawMode === "function") {
    return readMaskedAuthApiKey(input, output);
  }

  if (!input.isTTY) {
    return readPipedAuthApiKey(input);
  }

  throw new AuthInputRequiredError();
}

async function validateApiKeyWithUserInfo(apiKey: string): Promise<void> {
  await createCfbdApi(apiKey).userInfo();
}

export function createAuthService(
  options: CreateAuthServiceOptions = {},
): AuthService {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stderr;
  const validateApiKey = options.validateApiKey ?? validateApiKeyWithUserInfo;

  return {
    async saveCredential(): Promise<SavedCredential> {
      const apiKey = await readAuthApiKey(input, output);
      await validateApiKey(apiKey);
      return saveCredential(apiKey, {
        ...(options.environmentFile === undefined
          ? {}
          : { environmentFile: options.environmentFile }),
      });
    },
  };
}
