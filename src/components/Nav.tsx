import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { WalletConnect } from "./WalletConnect";

const links = [
  { to: "/", label: "MY WALLET" },
  { to: "/economy", label: "ECONOMY" },
  { to: "/skills", label: "SKILLS" },
  { to: "/leaderboard", label: "LEADERBOARD" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-panel border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-7 h-7 bg-yellow flex items-center justify-center">
            <span className="font-display text-black text-sm">M</span>
          </div>
          <div className="leading-none">
            <div className="font-display text-foreground text-sm sm:text-base tracking-tight">
              MEMEAUTONOM
            </div>
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.18em] hidden sm:block">
              Agentic Wallet OS
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-yellow border-yellow" }}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-2 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-green">
              Mantle · 5000
            </span>
          </div>
          <WalletConnect />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="lg:hidden w-9 h-9 border border-border flex items-center justify-center text-foreground hover:border-yellow"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {open ? (
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" />
              ) : (
                <>
                  <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.4" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-border bg-panel">
          <div className="max-w-[1400px] mx-auto px-4 py-2 flex flex-col">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "text-yellow" }}
                onClick={() => setOpen(false)}
                className="font-mono text-xs uppercase tracking-[0.14em] py-3 border-b border-border/50 last:border-b-0 text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
