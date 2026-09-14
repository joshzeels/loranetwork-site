"use client";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";

type Result = { ok: boolean; message: string; errors?: Record<string, string> };

export function EnquiryBuilder({ initialSku }: { initialSku: string }) {
  const startedAt = useRef(0);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setResult(null);
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, startedAt: startedAt.current }) });
      const nextResult = await response.json() as Result;
      setResult(nextResult);
      if (nextResult.ok) form.reset();
    } catch { setResult({ ok: false, message: "The enquiry could not be sent. Please try again later." }); }
    finally { setPending(false); }
  }

  const error = (field: string) => result?.errors?.[field] ? <span className="field-error" id={`${field}-error`}>{result.errors[field]}</span> : null;
  const a11y = (field: string) => ({ "aria-invalid": Boolean(result?.errors?.[field]), "aria-describedby": result?.errors?.[field] ? `${field}-error` : undefined });
  return <div className="enquiry-builder"><form onSubmit={submit} onFocusCapture={() => { if (!startedAt.current) startedAt.current = Date.now(); }} className="enquiry-form" noValidate>
    <div className="form-row"><label htmlFor="name"><span className="field-label">Name <span aria-hidden="true">*</span></span><input id="name" name="name" required maxLength={100} autoComplete="name" {...a11y("name")} />{error("name")}</label><label htmlFor="company">Company<input id="company" name="company" maxLength={120} autoComplete="organization" {...a11y("company")} />{error("company")}</label></div>
    <div className="form-row"><label htmlFor="email"><span className="field-label">Email <span aria-hidden="true">*</span></span><input id="email" name="email" type="email" required maxLength={254} autoComplete="email" {...a11y("email")} />{error("email")}</label><label htmlFor="phone">Phone<input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" {...a11y("phone")} />{error("phone")}</label></div>
    <div className="form-row"><label htmlFor="sku">Product / SKU<input id="sku" name="sku" defaultValue={initialSku} maxLength={100} {...a11y("sku")} />{error("sku")}</label><label htmlFor="quantity">Quantity<input id="quantity" name="quantity" type="number" inputMode="numeric" min={1} max={100000} step={1} {...a11y("quantity")} />{error("quantity")}</label></div>
    <label htmlFor="message"><span className="field-label">Message <span aria-hidden="true">*</span></span><textarea id="message" name="message" rows={6} required maxLength={3000} {...a11y("message")} />{error("message")}</label>
    <div className="honeypot" aria-hidden="true"><label htmlFor="website">Website<input id="website" name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <p className="privacy-notice">We use the details you submit only to respond to this enquiry. See the <Link href="/privacy">Privacy Notice</Link>.</p>
    <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}</button>
    <div className={`form-status ${result?.ok ? "is-success" : "is-error"}`} role="status" aria-live="polite">{result?.message}</div>
  </form><aside className="enquiry-summary"><h2>Before submitting</h2><p>Include the exact SKU and quantity where applicable. Submitting an enquiry does not confirm stock, availability, delivery dates or quote validity.</p><p>If delivery is not configured or fails, the form will state that your message was not sent.</p></aside></div>;
}
