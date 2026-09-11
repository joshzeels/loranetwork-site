export type Enquiry = {
  name: string;
  company: string;
  email: string;
  phone: string;
  sku: string;
  quantity: number | null;
  message: string;
  pageUrl: string;
  submittedAt: string;
};

export type DeliveryResult = { delivered: true; providerMessageId?: string } | { delivered: false; reason: "not-configured" | "provider-error" };
