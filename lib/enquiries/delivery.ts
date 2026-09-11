import "server-only";
import { BUSINESS_CONFIG } from "@/config/business";
import type { DeliveryResult, Enquiry } from "./types";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export async function deliverEnquiry(enquiry: Enquiry, product: { name: string; displayedPrice: string } | null): Promise<DeliveryResult> {
  const config = BUSINESS_CONFIG.enquiries;
  if (!config.recipientEmail || config.provider !== "resend" || !config.apiKey || !config.fromAddress) return { delivered: false, reason: "not-configured" };
  const fields = [
    ["Name", enquiry.name], ["Company", enquiry.company], ["Email", enquiry.email], ["Phone", enquiry.phone],
    ["SKU", enquiry.sku], ["Product name", product?.name ?? ""], ["Displayed ZAR price", product?.displayedPrice ?? ""],
    ["Quantity", enquiry.quantity?.toString() ?? ""], ["Message", enquiry.message], ["Page URL", enquiry.pageUrl], ["Submission timestamp", enquiry.submittedAt],
  ];
  const text = fields.map(([label, value]) => `${label}: ${value}`).join("\n");
  const html = `<h2>Customer</h2><dl>${fields.slice(0, 4).map(([l, v]) => `<dt>${escapeHtml(l)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl><h2>Product</h2><dl>${fields.slice(4, 8).map(([l, v]) => `<dt>${escapeHtml(l)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl><h2>Message</h2><p>${escapeHtml(enquiry.message).replace(/\n/g, "<br>")}</p><p>Page URL: ${escapeHtml(enquiry.pageUrl)}<br>Submission timestamp: ${escapeHtml(enquiry.submittedAt)}</p>`;
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: config.fromAddress, to: [config.recipientEmail], reply_to: enquiry.email, subject: `Website enquiry${enquiry.sku ? ` — ${enquiry.sku}` : ""}`, text, html }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) return { delivered: false, reason: "provider-error" };
    const result = await response.json() as { id?: string };
    return { delivered: true, providerMessageId: result.id };
  } catch { return { delivered: false, reason: "provider-error" }; }
}
