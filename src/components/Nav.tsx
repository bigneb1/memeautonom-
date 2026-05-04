import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "MY WALLET" },
  { to: "/economy", label: "ECONOMY" },
  { to: "/skills", label: "SKILLS" },
  { to: "/leaderboard", label: "LEADERBOARD" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-30 bg-panel border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-7 h-7 bg-yellow flex items-center justify-center">
            <span className="font-display text-black text-sm">M</span>
          </div>
          <div className="leading-none">
            <div className="font-display text-foreground text-base tracking-tight">
              MEMEAUTONOM
            </div>
            <div className="font-mono text-[9px] text-muted-foreground uppercase tracking-[0.18em]">
              Agentic Wallet OS
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-green">
              Mantle · 5000
            </span>
          </div>
          <span className="tag text-red border-red">NO HUMAN</span>
        </div>
      </div>
    </header>
  );
}
