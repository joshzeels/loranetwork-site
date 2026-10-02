"use client";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en-ZA">
      <body style={{ margin: 0, background: "#f7f9fc", color: "#102946", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
          <section role="alert" style={{ maxWidth: "42rem" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(2.5rem, 8vw, 5rem)" }}>Something went wrong.</h1>
            <p>Please try again.</p>
            <button type="button" onClick={retry}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
