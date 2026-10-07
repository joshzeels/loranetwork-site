export type EnquiryProductOption = Readonly<{ sku: string; name: string }>;

export const MIN_PRODUCT_QUERY_LENGTH = 2;
export const MAX_PRODUCT_SUGGESTIONS = 15;

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-ZA");
}

export function formatProductSelection(product: EnquiryProductOption) {
  return `${product.sku} | ${product.name}`;
}

export function productSkuFromSelection(value: string) {
  return value.split("|", 1)[0]?.trim() ?? "";
}

export function resolveProductOption(products: readonly EnquiryProductOption[], value: string) {
  const query = normalized(value);
  if (!query) return undefined;
  return products.find((product) => normalized(product.sku) === query)
    ?? products.find((product) => normalized(product.name) === query)
    ?? products.find((product) => normalized(formatProductSelection(product)) === query);
}

export function getProductSuggestions(products: readonly EnquiryProductOption[], value: string) {
  const query = normalized(value);
  if (!query) return [];
  const exactSku = products.find((product) => normalized(product.sku) === query);
  if (query.length < MIN_PRODUCT_QUERY_LENGTH) return exactSku ? [exactSku] : [];

  return products
    .map((product, catalogueIndex) => {
      const sku = normalized(product.sku);
      const name = normalized(product.name);
      let rank = Number.POSITIVE_INFINITY;
      if (sku === query) rank = 0;
      else if (sku.startsWith(query)) rank = 1;
      else if (name === query) rank = 2;
      else if (name.startsWith(query)) rank = 3;
      else if (sku.includes(query) || name.includes(query)) rank = 4;
      return { product, rank, catalogueIndex };
    })
    .filter((match) => Number.isFinite(match.rank))
    .sort((left, right) => left.rank - right.rank || left.catalogueIndex - right.catalogueIndex)
    .slice(0, MAX_PRODUCT_SUGGESTIONS)
    .map((match) => match.product);
}

export function moveActiveProduct(current: number, key: "ArrowDown" | "ArrowUp", resultCount: number) {
  if (!resultCount) return -1;
  if (key === "ArrowDown") return current < resultCount - 1 ? current + 1 : 0;
  return current > 0 ? current - 1 : resultCount - 1;
}
