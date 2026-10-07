import "server-only";
import { createMauticDelivery } from "./mautic";

export const deliverEnquiry = createMauticDelivery({
  baseUrl: process.env.MAUTIC_BASE_URL,
  formId: process.env.MAUTIC_ENQUIRY_FORM_ID,
  formName: process.env.MAUTIC_ENQUIRY_FORM_NAME,
});
