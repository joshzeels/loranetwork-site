"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="empty-page shell" role="alert">
      <h1>Something went wrong.</h1>
      <p>Please try again.</p>
      <button type="button" className="button button-dark" onClick={retry}>Try again</button>
    </section>
  );
}
