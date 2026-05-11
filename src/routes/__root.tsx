import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { ParticleBG } from "../components/ParticleBG";
import { Nav } from "../components/Nav";
import { Ticker } from "../components/Ticker";
import { Web3Providers } from "../components/Web3Providers";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 z-10">
      <div className="max-w-md text-center panel p-10">
        <div className="font-display text-7xl text-yellow">404</div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mt-2">
          wallet not found in registry
        </div>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-yellow text-black font-mono text-xs uppercase tracking-[0.18em] px-4 py-2.5"
          >
            ← back to my wallet
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MemeAutonom · Agentic Wallet OS" },
      { name: "description", content: "Observatory for autonomous wallets on Mantle. Activate once. Walk away. The wallet IS the agent." },
      { property: "og:title", content: "MemeAutonom · Agentic Wallet OS" },
      { property: "og:description", content: "Observatory for autonomous wallets on Mantle. Activate once. Walk away. The wallet IS the agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "MemeAutonom · Agentic Wallet OS" },
      { name: "twitter:description", content: "Observatory for autonomous wallets on Mantle. Activate once. Walk away. The wallet IS the agent." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/947e60de-5522-4f08-8879-e00a1c90adc4" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/947e60de-5522-4f08-8879-e00a1c90adc4" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,
});

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 z-10 bg-background">
      <div className="max-w-md w-full text-center panel p-8 sm:p-10">
        <div className="font-display text-6xl text-yellow">!</div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-3">
          autonomous loop interrupted
        </div>
        <h1 className="font-display text-2xl text-foreground mt-4">Something went wrong</h1>
        <p className="font-mono text-xs text-muted-foreground mt-2">
          The app failed to load. This is usually a transient network or RPC issue.
        </p>
        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto border border-border bg-black/40 p-3 text-left font-mono text-[10px] text-red">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2.5 bg-yellow text-black hover:bg-yellow/90 transition-colors"
          >
            Retry
          </button>
          <a
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2.5 border border-border text-foreground hover:border-yellow transition-colors"
          >
            Reload home
          </a>
        </div>
      </div>
    </div>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <Web3Providers>
      <div className="relative min-h-screen bg-background">
        <ParticleBG />
        <div className="relative z-10">
          <Nav />
          <Ticker />
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Outlet />
          </main>
          <footer className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-10 border-t border-border mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                MemeAutonom · Track 6 · Turing Test Hackathon 2026
              </div>
              <div className="font-serif-italic text-sm text-muted-foreground">
                the wallet <span className="text-yellow not-italic font-mono">IS</span> the agent
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Web3Providers>
  );
}
