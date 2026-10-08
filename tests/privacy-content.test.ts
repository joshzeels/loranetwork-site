import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const privacyPage = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");

test("privacy notice describes the current enquiry fields and message-based quantity details", () => {
  assert.match(privacyPage, /first name, last name, email address, phone number, selected Product \/ SKU/);
  assert.match(privacyPage, /message or project details you provide/);
  assert.match(privacyPage, /quantity you need in the Message field/);
  assert.doesNotMatch(privacyPage, /company, email address/);
  assert.doesNotMatch(privacyPage, /requested quantity/);
});

test("privacy notice discloses the current anti-abuse and enquiry-handling services", () => {
  assert.match(privacyPage, /Google reCAPTCHA helps protect the enquiry form from spam and abuse/);
  assert.match(privacyPage, /processed through our Mautic system to handle and record enquiries/);
  assert.doesNotMatch(privacyPage, /transactional email provider/);
  assert.match(privacyPage, /Submitting an enquiry does not subscribe you to marketing/);
});
