export const RECAPTCHA_ACTION = "enquiry_submit";
export const DEFAULT_RECAPTCHA_MIN_SCORE = 0.5;

type RecaptchaResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
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

export async function verifyRecaptchaToken(token: string, options: VerificationOptions): Promise<boolean> {
  const secret = options.secret?.trim();
  const minimumScore = parseMinimumScore(options.minimumScore);
  const expectedHostname = normaliseHostname(options.expectedHostname);
  if (!token.trim() || !secret || !expectedHostname) return false;

  try {
    const response = await (options.fetchImplementation ?? fetch)("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return false;

    const result = await response.json() as RecaptchaResponse;
    if (!result.success || result.action !== RECAPTCHA_ACTION || typeof result.score !== "number" || result.score < minimumScore) return false;
    if (result.hostname && normaliseHostname(result.hostname) !== expectedHostname) return false;
    return true;
  } catch {
    return false;
  }
}
