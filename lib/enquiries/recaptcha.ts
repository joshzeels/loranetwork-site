export const RECAPTCHA_ACTION = "enquiry_submit";
export const DEFAULT_RECAPTCHA_MIN_SCORE = 0.5;

type RecaptchaResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: unknown;
};

type VerificationOptions = {
  secret?: string;
  minimumScore?: string;
  expectedHostname: string;
  fetchImplementation?: typeof fetch;
};

function parseMinimumScore(value: string | undefined) {
  if (!value?.trim()) return DEFAULT_RECAPTCHA_MIN_SCORE;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_RECAPTCHA_MIN_SCORE;
}

function normaliseHostname(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function logVerificationFailure(reason: string, details: Record<string, unknown> = {}) {
  console.warn("[enquiries] reCAPTCHA verification failed", { reason, ...details });
}

function safeErrorCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((code): code is string => typeof code === "string" && /^[a-z0-9-]+$/i.test(code)).slice(0, 10);
}

export async function verifyRecaptchaToken(token: string, options: VerificationOptions): Promise<boolean> {
  const secret = options.secret?.trim();
  const minimumScore = parseMinimumScore(options.minimumScore);
  const expectedHostname = normaliseHostname(options.expectedHostname);
  if (!secret || !expectedHostname) {
    logVerificationFailure("missing-configuration", {
      secretConfigured: Boolean(secret),
      expectedHostnameConfigured: Boolean(expectedHostname),
    });
    return false;
  }
  if (!token.trim()) {
    logVerificationFailure("missing-token");
    return false;
  }

  let response: Response;
  try {
    response = await (options.fetchImplementation ?? fetch)("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    const timeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    logVerificationFailure(timeout ? "google-timeout" : "google-network-failure");
    return false;
  }

  if (!response.ok) {
    logVerificationFailure("google-http-failure", { status: response.status });
    return false;
  }

  let result: RecaptchaResponse;
  try {
    const parsed: unknown = await response.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Unexpected response");
    result = parsed as RecaptchaResponse;
  } catch {
    logVerificationFailure("malformed-google-response");
    return false;
  }

  const returnedDetails = {
    returnedHostname: typeof result.hostname === "string" ? result.hostname : undefined,
    returnedAction: typeof result.action === "string" ? result.action : undefined,
    score: typeof result.score === "number" ? result.score : undefined,
    minimumScore,
  };
  if (result.success === false) {
    logVerificationFailure("google-success-false", { ...returnedDetails, errorCodes: safeErrorCodes(result["error-codes"]) });
    return false;
  }
  if (result.success !== true || typeof result.action !== "string" || typeof result.score !== "number" || (result.hostname && typeof result.hostname !== "string")) {
    logVerificationFailure("malformed-google-response", returnedDetails);
    return false;
  }
  if (result.action !== RECAPTCHA_ACTION) {
    logVerificationFailure("action-mismatch", returnedDetails);
    return false;
  }
  if (result.score < minimumScore) {
    logVerificationFailure("score-below-threshold", returnedDetails);
    return false;
  }
  if (result.hostname && normaliseHostname(result.hostname) !== expectedHostname) {
    logVerificationFailure("hostname-mismatch", returnedDetails);
    return false;
  }
  return true;
}
