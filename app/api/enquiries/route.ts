import { products } from "@/lib/catalogue";
import { deliverEnquiry } from "@/lib/enquiries/delivery";
import { createEnquiryHandler } from "@/lib/enquiries/handler";
import { verifyRecaptchaToken } from "@/lib/enquiries/recaptcha";
import { getPublicPriceForProduct } from "@/lib/pricing";
import { BUSINESS_CONFIG } from "@/config/business";

export const runtime = "nodejs";

export const POST = createEnquiryHandler({
  siteUrl: BUSINESS_CONFIG.site.url,
  findProduct(sku) {
    const product = products.find((item) => item.sku.toLocaleLowerCase("en-ZA") === sku.toLocaleLowerCase("en-ZA"));
    return product ? { sku: product.sku, name: product.sku, displayedPrice: getPublicPriceForProduct(product.sku, product.priceUsd).formatted } : undefined;
  },
  deliver: deliverEnquiry,
  verifyRecaptcha(token, expectedHostname) {
    return verifyRecaptchaToken(token, {
      secret: process.env.RECAPTCHA_SECRET_KEY,
      minimumScore: process.env.RECAPTCHA_MIN_SCORE,
      expectedHostname,
    });
  },
});
