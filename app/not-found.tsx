import Link from "next/link";

export default function NotFound() {
  return (
    <section className="empty-page shell">
      <h1>Page not found.</h1>
      <p>The page you requested could not be found.</p>
      <div className="not-found-actions">
        <Link href="/" className="button button-dark">Back to homepage</Link>
        <Link href="/products" className="button button-outline">Products</Link>
        <Link href="/applications" className="button button-outline">Applications</Link>
      </div>
    </section>
  );
}
