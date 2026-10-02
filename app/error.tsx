"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section className="empty-page shell" role="alert">
      <h1>Something went wrong.</h1>
      <p>Please try again.</p>
      <button type="button" className="button button-dark" onClick={retry}>Try again</button>
    </section>
  );
}
