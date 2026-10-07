export type Enquiry = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  productSku: string;
  message: string;
};

export type DeliveryResult = { delivered: true } | { delivered: false; reason: "not-configured" | "provider-error" };
