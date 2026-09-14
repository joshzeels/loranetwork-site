# LoRa Network South Africa

A source-grounded South African catalogue for Dragino IoT products. The application is built with Next.js App Router and statically generates an indexable page for every product in the supplied workbook.

## Production configuration

Copy `.env.example` to an ignored local environment file or configure these values in Vercel. `NEXT_PUBLIC_SITE_URL` is the only public value; pricing and enquiry values remain server/build-side.

- `NEXT_PUBLIC_SITE_URL`: production origin used by metadata, canonicals, structured data, robots and sitemap.
- `USD_ZAR_RATE`: optional override for the centrally approved R16.75/USD buffered rate. A change requires a new build/deployment because catalogue prices are statically generated.
- `PRICING_RATE_UPDATED_AT`: required launch audit date in `YYYY-MM-DD` format; it remains private and must be no more than 14 days old when the audit runs.
- `VAT_DISPLAY_MODE`: `inclusive` or `exclusive` for launch (`none` remains a safe local-development fallback); this changes only the label and never adds VAT.
- `CONTACT_RECIPIENT_EMAIL`: private enquiry recipient.
- `EMAIL_PROVIDER`: currently `resend` when delivery is activated.
- `EMAIL_API_KEY`: private provider credential.
- `EMAIL_FROM_ADDRESS`: provider-verified sender.
- `ANALYTICS_ID`: reserved for a future selected integration; no analytics currently loads.
- `BUSINESS_EMAIL`, `BUSINESS_PHONE`, `BUSINESS_ADDRESS`: optional confirmed public details, omitted when blank.
- `LEGAL_CONTENT_APPROVED`: set to `true` only after the operating business has approved the privacy notice and website terms.

The enquiry endpoint validates submissions server-side and uses a honeypot, minimum submission time and best-effort in-memory rate limiting. Because Vercel instances do not share memory, distributed rate limiting is the recommended later hardening step if abuse appears.

No live exchange-rate service is used. The current application sets no cookies, writes no browser storage and loads no analytics. Reassess consent requirements before enabling tracking.

## Technology

- Next.js 16.3.4 with the App Router and Turbopack
- React and React DOM 19.2.8
- TypeScript 5.9.3 in strict mode
- Tailwind CSS 4.3.3 through PostCSS, plus the project design system in `app/globals.css`
- ESLint 9.39.5 with the Next.js Core Web Vitals and TypeScript presets

## Catalogue source

The authoritative source is:

`data/source/Dragino_Price_List_For_Import_20260907.xlsx`

The import reads the `Price List Brief` worksheet and generates:

- `data/dragino-products.json` for internal application use
- `data/dragino-products.audit.json` for source-quality checks

Run the import after replacing or updating the workbook:

```powershell
npm run catalogue:import
```

The import validates the expected columns, retains SKU values, keeps empty cells empty, and stores the source supplier price internally. The excluded currency column is not imported into application product data. Route slugs are generated separately and do not alter source SKUs.

## Commercial pricing

The commercial pricing configuration has one source of truth:

- `config/pricing.ts` — conversion and markup configuration
- `lib/pricing.ts` — validation, complete calculation, final two-decimal rounding, ZAR formatting, quote state, and schema amount

The source supplier price is never sent to catalogue client components. `lib/catalogue.ts` maps internal records to a public product shape containing only the calculated ZAR selling price and its formatted value.

Products without a valid source price use `Contact for pricing`. They do not emit an Offer in Product structured data. Products with a valid price emit one ZAR Offer using the same utility result displayed on the page. No stock availability value is emitted.

## Routes and functionality

- `/` — marketing home, source-handling summary, application entry points and visible answer-oriented content
- `/products` — searchable, filterable product catalogue
- `/products/[slug]` — statically generated source-data page for each product
- `/about` — catalogue provenance and publishing rules
- `/robots.txt` and `/sitemap.xml` — generated crawler assets

Product metadata, Product structured data, breadcrumbs, canonical URLs, semantic headings, and visible factual questions and answers provide the SEO/AEO foundation. Blanket FAQPage structured data is not emitted.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For production, copy `.env.example` to an appropriate environment file and replace the placeholder with the real public origin:

```text
NEXT_PUBLIC_SITE_URL=https://your-real-domain.co.za
```

This value is required for production canonical URLs, structured data, `robots.txt`, and `sitemap.xml`.

## Verification

```bash
npm test
npm run lint
npm run build
npm run pricing:reconcile
npm run launch:audit
```

The pricing reconciliation reads all generated product HTML and verifies source totals, public ZAR prices, contact states, Product Offer values, public supplier-price exposure, duplicate SKUs, and missing pages. Its detailed result is written to `reports/pricing-reconciliation.json`.

## Commercial inputs still required

The site operates as an enquiry catalogue, so stock, lead times, delivery and quote validity remain subject to confirmation rather than being invented. Before deployment, configure the public origin, an approved current exchange rate and date, VAT display treatment, enquiry delivery, at least one public fallback contact method, and legal-content approval. `npm run launch:audit` enforces those launch inputs without printing private values.
