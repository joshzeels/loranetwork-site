import { findEnquiryProduct } from "@/lib/enquiries/catalogue";
import { deliverEnquiry } from "@/lib/enquiries/delivery";
import { createEnquiryHandler } from "@/lib/enquiries/handler";
import { verifyRecaptchaToken } from "@/lib/enquiries/recaptcha";
import { BUSINESS_CONFIG } from "@/config/business";

export const runtime = "nodejs";

export const POST = createEnquiryHandler({
  siteUrl: BUSINESS_CONFIG.site.url,
  findProduct: findEnquiryProduct,
  deliver: deliverEnquiry,
  verifyRecaptcha(token, expectedHostname) {
    return verifyRecaptchaToken(token, {
      secret: process.env.RECAPTCHA_SECRET_KEY,
      minimumScore: process.env.RECAPTCHA_MIN_SCORE,
      expectedHostname,
    });
  },
});
