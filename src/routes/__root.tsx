import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
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
      { property: "og:description", content: "Observatory for autonomous wallets on Mantle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

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
