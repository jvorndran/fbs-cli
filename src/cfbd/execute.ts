import { CfbdRequestError, redactSensitive } from "../errors";

interface RequestResult<T> {
  data: T | undefined;
  error: unknown;
  response: Response;
}

function errorCodeForStatus(status: number): string {
  if (status === 400 || status === 422) return "cfbd_bad_request";
  if (status === 401) return "cfbd_unauthorized";
  if (status === 403) return "cfbd_forbidden";
  if (status === 404) return "cfbd_not_found";
  if (status === 429) return "cfbd_rate_limited";
  if (status >= 500) return "cfbd_server_error";
  return "cfbd_request_failed";
}

function extractMessage(error: unknown, response: Response): string {
  if (typeof error === "string" && error.length > 0) {
    return redactSensitive(error);
  }

  if (error instanceof Error && error.message.length > 0) {
    return redactSensitive(error.message);
  }

  if (error !== null && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "title"] as const) {
      const value = candidate[key];
      if (typeof value === "string" && value.length > 0) {
        return redactSensitive(value);
      }
    }
  }

  return response.statusText || `CFBD request failed with status ${response.status}.`;
}

function hintForStatus(status: number, message: string): string | undefined {
  if (
    (status === 401 || status === 403) &&
    /(?:patreon|subscription|subscription tier|tier \d|tier higher)/i.test(message)
  ) {
    return "This endpoint requires a higher CFBD subscription tier.";
  }
  if (status === 401) {
    return "Verify that CFBD_API_KEY is valid and active.";
  }
  if (status === 403) {
    return "Your CFBD subscription tier may not authorize this endpoint.";
  }
  if (status === 429) {
    return "Wait for the CFBD quota window to reset, or inspect it with fbs info usage.";
  }
  return undefined;
}

export async function executeCfbd<T>(request: () => Promise<RequestResult<T>>): Promise<T> {
  let result: RequestResult<T>;
  try {
    result = await request();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The CFBD request could not be sent.";
    throw new CfbdRequestError({
      code: "network_error",
      message: redactSensitive(message),
      hint: "Check network connectivity and try again.",
      cause: error,
    });
  }

  if (result.error !== undefined || result.data === undefined || !result.response.ok) {
    const message = extractMessage(result.error, result.response);
    const hint = hintForStatus(result.response.status, message);
    throw new CfbdRequestError({
      code: errorCodeForStatus(result.response.status),
      status: result.response.status,
      message,
      ...(hint === undefined ? {} : { hint }),
    });
  }

  return result.data;
}
