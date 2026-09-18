"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { displayValue, facetValue, type PublicDraginoProduct } from "@/lib/product-presentation";

type FacetOption = { value: string; count: number };

type ProductCatalogueProps = {
  products: PublicDraginoProduct[];
  applications: FacetOption[];
  interfaces: FacetOption[];
  priceNotice: string;
};

const PAGE_SIZE = 24;
const SEARCH_EXAMPLES = ["water", "temperature", "humidity", "gateway", "tracker", "RS485", "Modbus", "LoRaWAN", "LTE CAT 1", "agriculture", "level", "meter", "CO2"];

function normaliseSearchText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en-ZA").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function ProductCatalogue({ products, applications, interfaces, priceNotice }: ProductCatalogueProps) {
  const [query, setQuery] = useState("");
  const [application, setApplication] = useState("");
  const [iotInterface, setIotInterface] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const filteredProducts = useMemo(() => {
    const searchTerms = normaliseSearchText(deferredQuery).split(" ").filter(Boolean);

    return products.filter((product) => {
      if (application && facetValue(product.application) !== application) return false;
      if (iotInterface && facetValue(product.iotInterface) !== iotInterface) return false;
      if (!searchTerms.length) return true;

      const searchable = normaliseSearchText([product.sku, product.application, product.specification, product.iotInterface].join(" "));
      return searchTerms.every((term) => searchable.includes(term));
    });
  }, [application, deferredQuery, iotInterface, products]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasFilters = Boolean(query || application || iotInterface);

  function clearFilters() {
    setQuery("");
    setApplication("");
    setIotInterface("");
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="catalogue-explorer" id="catalogue">
      <div className="catalogue-controls">
        <label className="search-control">
          <span className="sr-only">Search products</span>
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search SKU or specification"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <CloseIcon />
            </button>
          ) : null}
        </label>

        <label className="select-control">
          <span>Application</span>
          <select
            value={application}
            onChange={(event) => {
              setApplication(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <option value="">All applications</option>
            {applications.map((option) => (
              <option key={facetValue(option.value)} value={facetValue(option.value)}>
                {option.value} ({option.count})
              </option>
            ))}
          </select>
        </label>

        <label className="select-control">
          <span>IoT interface</span>
          <select
            value={iotInterface}
            onChange={(event) => {
              setIotInterface(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <option value="">All interfaces</option>
            {interfaces.map((option) => (
              <option key={facetValue(option.value)} value={facetValue(option.value)}>
                {displayValue(option.value)} ({option.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="search-examples" aria-label="Supported catalogue search examples">
        <span>Try:</span>
        {SEARCH_EXAMPLES.map((example) => <button type="button" key={example} onClick={() => { setQuery(example); setVisibleCount(PAGE_SIZE); }}>{example}</button>)}
      </div>

      <div className="catalogue-status">
        <p aria-live="polite">
          <strong>{filteredProducts.length.toLocaleString("en-ZA")}</strong>{" "}
          {filteredProducts.length === 1 ? "product" : "products"}
        </p>
        {hasFilters ? (
          <button type="button" className="text-button" onClick={clearFilters}>
            Clear all filters <CloseIcon />
          </button>
        ) : (
          <p>Prices shown in South African rand. {priceNotice}</p>
        )}
      </div>

      {visibleProducts.length ? (
        <>
          <div className="product-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          {visibleProducts.length < filteredProducts.length ? (
            <div className="load-more-wrap">
              <button
                className="button button-outline"
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Show more products
                <span>{visibleProducts.length} of {filteredProducts.length}</span>
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">
          <h2>Try a broader search</h2>
          <p>No products match those filters.</p>
          <button type="button" className="button button-dark" onClick={clearFilters}>Reset filters</button>
        </div>
      )}
    </div>
  );
}
