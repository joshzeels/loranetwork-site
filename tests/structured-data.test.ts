import assert from "node:assert/strict";
import test from "node:test";
import { buildOrganizationSchema, buildProductManufacturer, buildProductOffer, buildWebsiteSchema, organizationId } from "../lib/structured-data.ts";

const siteUrl = "https://example.co.za";

// Walks a JSON-LD value looking for any "@type" (or nested @type) equal to "FAQPage" — enough to
// catch a helper accidentally reintroducing FAQPage schema, without scanning repository files.
function containsFaqPageType(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsFaqPageType);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record["@type"] === "FAQPage") return true;
    return Object.values(record).some(containsFaqPageType);
  }
  return false;
}

test("identifies LoRa Network as the Organization, not the manufacturer", () => {
  const organization = buildOrganizationSchema(siteUrl);
  assert.equal(organization["@type"], "Organization");
  assert.equal(organization.name, "LoRa Network");
  assert.equal(organization.areaServed, "South Africa");
  assert.equal(organization.url, siteUrl);
  assert.equal(organization["@id"], organizationId(siteUrl));
  assert.doesNotMatch(organization.name, /Dragino/);
});

test("does not add unsupported Organization fields", () => {
  const organization = buildOrganizationSchema(siteUrl);
  const disallowed = ["legalName", "vatID", "foundingDate", "numberOfEmployees", "address", "telephone", "email", "sameAs", "logo", "aggregateRating", "review"];
  for (const field of disallowed) assert.equal(field in organization, false, `Organization should not include ${field}`);
});

test("the WebSite publisher resolves to the same Organization @id", () => {
  const organization = buildOrganizationSchema(siteUrl);
  const website = buildWebsiteSchema(siteUrl);
  assert.deepEqual(website.publisher, { "@id": organization["@id"] });
});

test("organizationId is stable and derived only from the configured site URL", () => {
  assert.equal(organizationId(siteUrl), `${siteUrl}/#organization`);
  assert.equal(organizationId("https://other.example"), "https://other.example/#organization");
});

test("product manufacturer and brand remain Dragino", () => {
  const manufacturer = buildProductManufacturer();
  assert.deepEqual(manufacturer.brand, { "@type": "Brand", name: "Dragino" });
  assert.deepEqual(manufacturer.manufacturer, { "@type": "Organization", name: "Dragino" });
});

test("a priced Offer's seller resolves to the LoRa Network Organization @id", () => {
  const offer = buildProductOffer(siteUrl, `${siteUrl}/products/example-sku`, "1234.56");
  assert.deepEqual(offer.seller, { "@id": organizationId(siteUrl) });
  assert.equal(offer.price, "1234.56");
  assert.equal(offer.priceCurrency, "ZAR");
});

test("none of the structured-data helpers introduce FAQPage schema", () => {
  const organization = buildOrganizationSchema(siteUrl);
  const website = buildWebsiteSchema(siteUrl);
  const manufacturer = buildProductManufacturer();
  const offer = buildProductOffer(siteUrl, `${siteUrl}/products/example-sku`, "1234.56");
  assert.equal(containsFaqPageType([organization, website, manufacturer, offer]), false);
});
