import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-page shell">
      <h1>That product is not in the catalogue.</h1>
      <p>Check the SKU or return to the complete product list.</p>
      <Link href="/products" className="button button-dark">Browse all products</Link>
    </section>
  );
}
