import type { Enquiry } from "./types.ts";

export type EnquiryInput = Record<string, unknown>;
export type ValidationResult = { ok: true; value: Enquiry } | { ok: false; errors: Record<string, string> };

const limits = { firstName: 100, lastName: 100, email: 254, phone: 40, productSku: 200, message: 3000 } as const;
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
  const firstName = text(input.firstName, "firstName", true); const lastName = text(input.lastName, "lastName", true);
  const email = text(input.email, "email", true); const phone = text(input.phone, "phone", true);
  const productSku = text(input.productSku, "productSku", true); const message = text(input.message, "message", true);
  for (const [key, result] of Object.entries({ firstName, lastName, email, phone, productSku, message })) if (result.error) errors[key] = result.error;
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { firstName: firstName.value!, lastName: lastName.value!, email: email.value!, phone: phone.value!, productSku: productSku.value!, message: message.value! } };
}
