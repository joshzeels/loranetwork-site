"use client";
import Link from "next/link";
import Script from "next/script";
import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { formatProductSelection, getProductSuggestions, moveActiveProduct, resolveProductOption, type EnquiryProductOption } from "@/lib/enquiries/product-options";

type Result = { ok: boolean; message: string; errors?: Record<string, string> };
type RecaptchaApi = { ready: (callback: () => void) => void; execute: (siteKey: string, options: { action: string }) => Promise<string> };

declare global {
  interface Window { grecaptcha?: RecaptchaApi }
}

const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();
const unavailableMessage = "The enquiry service is currently unavailable. Please try again later.";

function waitForRecaptchaApi() {
  return new Promise<RecaptchaApi>((resolve, reject) => {
    const deadline = Date.now() + 5000;
    function check() {
      if (window.grecaptcha) resolve(window.grecaptcha);
      else if (Date.now() >= deadline) reject(new Error("reCAPTCHA unavailable"));
      else window.setTimeout(check, 50);
    }
    check();
  });
}

async function getRecaptchaToken() {
  if (!siteKey) throw new Error("reCAPTCHA unavailable");
  const recaptcha = await waitForRecaptchaApi();
  return new Promise<string>((resolve, reject) => {
    recaptcha.ready(() => {
      recaptcha.execute(siteKey, { action: "enquiry_submit" }).then(resolve, reject);
    });
  });
}

function ProductCombobox({ products, value, onChange, invalid, describedBy }: {
  products: readonly EnquiryProductOption[];
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => getProductSuggestions(products, value), [products, value]);
  const listId = "productSku-options";

  function select(product: EnquiryProductOption) {
    onChange(formatProductSelection(product));
    setOpen(false);
    setActiveIndex(-1);
  }

  function update(rawValue: string) {
    const exact = resolveProductOption(products, rawValue.trim());
    if (exact) {
      select(exact);
      return;
    }
    onChange(rawValue);
    const nextSuggestions = getProductSuggestions(products, rawValue);
    setOpen(nextSuggestions.length > 0);
    setActiveIndex(nextSuggestions.length ? 0 : -1);
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!suggestions.length) return;
      event.preventDefault();
      const navigationKey = event.key;
      setOpen(true);
      setActiveIndex((current) => moveActiveProduct(current, navigationKey, suggestions.length));
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      select(suggestions[activeIndex]);
    }
  }

  const expanded = open && suggestions.length > 0;
  return <div className="product-combobox">
    <input
      ref={inputRef}
      id="productSku"
      name="productSku"
      value={value}
      required
      maxLength={200}
      autoComplete="off"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={expanded}
      aria-controls={listId}
      aria-activedescendant={expanded && activeIndex >= 0 ? `productSku-option-${activeIndex}` : undefined}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      onChange={(event) => update(event.target.value)}
      onFocus={() => { if (!resolveProductOption(products, value) && suggestions.length) setOpen(true); }}
      onBlur={() => setOpen(false)}
      onKeyDown={keyDown}
    />
    {expanded ? <div className="product-suggestions" id={listId} role="listbox">
      {suggestions.map((product, index) => <div
        id={`productSku-option-${index}`}
        role="option"
        aria-selected={index === activeIndex}
        className={index === activeIndex ? "is-active" : undefined}
        key={product.sku}
        onMouseDown={(event) => { event.preventDefault(); select(product); inputRef.current?.focus(); }}
      ><strong>{product.sku}</strong><span>{product.name}</span></div>)}
    </div> : null}
  </div>;
}

export function EnquiryBuilder({ initialSku, products }: { initialSku: string; products: readonly EnquiryProductOption[] }) {
  const startedAt = useRef(0);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const initialProduct = products.find((product) => product.sku.toLocaleLowerCase("en-ZA") === initialSku.toLocaleLowerCase("en-ZA"));
  const initialProductValue = initialProduct ? formatProductSelection(initialProduct) : "";
  const [productValue, setProductValue] = useState(initialProductValue);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    const product = resolveProductOption(products, String(payload.productSku ?? ""));
    if (!product) {
      setResult({ ok: false, message: "Please correct the highlighted fields.", errors: { productSku: "Please select a product from the suggestions." } });
      return;
    }
    payload.productSku = formatProductSelection(product);
    setPending(true); setResult(null);
    try {
      const recaptchaToken = await getRecaptchaToken();
      const response = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, startedAt: startedAt.current, recaptchaToken }) });
      const nextResult = await response.json() as Result;
      setResult(nextResult);
      if (nextResult.ok) { form.reset(); setProductValue(initialProductValue); }
    } catch { setResult({ ok: false, message: unavailableMessage }); }
    finally { setPending(false); }
  }

  const error = (field: string) => result?.errors?.[field] ? <span className="field-error" id={`${field}-error`}>{result.errors[field]}</span> : null;
  const a11y = (field: string) => ({ "aria-invalid": Boolean(result?.errors?.[field]), "aria-describedby": result?.errors?.[field] ? `${field}-error` : undefined });
  return <div className="enquiry-builder">{siteKey ? <Script id="recaptcha-v3" src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`} strategy="afterInteractive" /> : null}<form onSubmit={submit} onFocusCapture={() => { if (!startedAt.current) startedAt.current = Date.now(); }} className="enquiry-form" noValidate aria-busy={pending}>
    <div className="form-row"><label htmlFor="firstName"><span className="field-label">First Name <span aria-hidden="true">*</span></span><input id="firstName" name="firstName" required maxLength={100} autoComplete="given-name" {...a11y("firstName")} />{error("firstName")}</label><label htmlFor="lastName"><span className="field-label">Last Name <span aria-hidden="true">*</span></span><input id="lastName" name="lastName" required maxLength={100} autoComplete="family-name" {...a11y("lastName")} />{error("lastName")}</label></div>
    <div className="form-row"><label htmlFor="email"><span className="field-label">Email <span aria-hidden="true">*</span></span><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" {...a11y("email")} />{error("email")}</label><label htmlFor="phone"><span className="field-label">Phone <span aria-hidden="true">*</span></span><input id="phone" name="phone" type="tel" required maxLength={40} autoComplete="tel" {...a11y("phone")} />{error("phone")}</label></div>
    <label htmlFor="productSku"><span className="field-label">Product / SKU <span aria-hidden="true">*</span></span><ProductCombobox products={products} value={productValue} onChange={setProductValue} invalid={Boolean(result?.errors?.productSku)} describedBy={result?.errors?.productSku ? "productSku-error" : undefined} />{error("productSku")}</label>
    <label htmlFor="message"><span className="field-label">Message <span aria-hidden="true">*</span></span><textarea id="message" name="message" rows={6} required maxLength={3000} {...a11y("message")} />{error("message")}</label>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website<input id="website" name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="privacy-notice">We use the details you submit only to respond to this enquiry. See the <Link href="/privacy">Privacy Notice</Link>.</p>
    <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}</button>
    <div className={`form-status ${result?.ok ? "is-success" : "is-error"}`} role={result?.ok ? "status" : "alert"}>{result?.message}</div>
  </form><aside className="enquiry-summary"><h2>What happens next?</h2><p>We’ll review your enquiry and respond about the selected product. Use the message field to include the quantity you need and any project details that will help us understand your requirements. Pricing, availability and delivery details will be confirmed when we respond.</p></aside></div>;
}
