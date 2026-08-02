import { emitKeypressEvents, type Key } from "node:readline";

import {
  AuthCancelledError,
  AuthInputRequiredError,
  InvalidAuthKeyError,
} from "../errors";
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
}

type PipedInput = AsyncIterable<string | Uint8Array>;

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

    output.write("CFBD API key: ");
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

export function createAuthService(
  options: CreateAuthServiceOptions = {},
): AuthService {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stderr;

  return {
    async saveCredential(): Promise<SavedCredential> {
      const apiKey = await readAuthApiKey(input, output);
      return saveCredential(apiKey, {
        ...(options.environmentFile === undefined
          ? {}
          : { environmentFile: options.environmentFile }),
      });
    },
  };
}
