import type { Enquiry } from "./types.ts";

export type EnquiryInput = Record<string, unknown>;
export type ValidationResult = { ok: true; value: Omit<Enquiry, "pageUrl" | "submittedAt"> } | { ok: false; errors: Record<string, string> };

const limits = { name: 100, company: 120, email: 254, phone: 40, sku: 100, message: 3000 } as const;
const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function text(input: unknown, field: keyof typeof limits, required = false) {
  if (typeof input !== "string") return { error: required ? "This field is required." : "Invalid value." };
  const value = input.trim();
  if (required && !value) return { error: "This field is required." };
  if (value.length > limits[field]) return { error: `Use ${limits[field]} characters or fewer.` };
  if (controlCharacters.test(value)) return { error: "Remove unsupported control characters." };
  return { value };
}

export function validateEnquiry(input: EnquiryInput): ValidationResult {
  const errors: Record<string, string> = {};
  const name = text(input.name, "name", true); const company = text(input.company, "company");
  const email = text(input.email, "email", true); const phone = text(input.phone, "phone");
  const sku = text(input.sku, "sku"); const message = text(input.message, "message", true);
  for (const [key, result] of Object.entries({ name, company, email, phone, sku, message })) if (result.error) errors[key] = result.error;
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.email = "Enter a valid email address.";
  let quantity: number | null = null;
  if (input.quantity !== "" && input.quantity !== undefined && input.quantity !== null) {
    const parsed = typeof input.quantity === "number" ? input.quantity : Number(input.quantity);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100000) errors.quantity = "Enter a whole number from 1 to 100,000.";
    else quantity = parsed;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name: name.value!, company: company.value!, email: email.value!, phone: phone.value!, sku: sku.value!, quantity, message: message.value! } };
}
