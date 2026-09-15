import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-page shell">
      <h1>We couldn’t find that product.</h1>
      <p>Check the product name or SKU, or browse the complete product range.</p>
      <Link href="/products" className="button button-dark">Browse all products</Link>
    </section>
  );
}
