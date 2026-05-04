import { useEffect } from "react";
import type { WalletDetail } from "@/lib/mock";
import { Tag } from "./Tag";

export function WalletDrawer({
  wallet,
  onClose,
}: {
  wallet: WalletDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!wallet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [wallet, onClose]);

  if (!wallet) return null;

  const roleColor =
    wallet.role === "SCOUT" ? "yellow" : wallet.role === "EXECUTOR" ? "cyan" : "purple";

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] md:w-[560px] bg-panel border-l border-border overflow-y-auto"
        style={{ boxShadow: "-20px 0 60px rgba(0,0,0,0.6)" }}
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Tag color="green" dot>LIVE</Tag>
            <Tag color="cyan">ERC-8004</Tag>
            <Tag color={roleColor as "cyan"}>{wallet.role}</Tag>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="w-8 h-8 border border-border flex items-center justify-center hover:border-yellow text-foreground shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              wallet address
            </div>
            <div className="font-display text-2xl sm:text-3xl text-foreground mt-1 break-all">
              {wallet.addr}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-1">
              activated {wallet.since} ago · Mantle 5000
            </div>
          </section>

          {/* Autonomy score */}
          <section className="border border-yellow/40 p-4 bg-yellow/[0.03]">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-yellow">
                autonomy score
              </div>
              <div className="font-display text-3xl text-yellow">{wallet.autonomy}%</div>
            </div>
            <div className="h-1.5 w-full bg-black/60 overflow-hidden">
              <div
                className="h-full bg-yellow"
                style={{ width: `${wallet.autonomy}%` }}
              />
            </div>
            <div className="font-mono text-[10px] text-muted-foreground mt-2 leading-relaxed">
              {wallet.autonomy}% of actions decided & signed by the wallet itself.
              No human approval flow detected in last {wallet.jobs} jobs.
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-2">
            <Mini label="REP" value={wallet.rep.toString()} color="text-yellow" />
            <Mini label="JOBS" value={wallet.jobs.toString()} color="text-cyan" />
            <Mini label="VOL USDC" value={wallet.vol.toLocaleString()} color="text-green" />
          </section>

          {/* Skills installed */}
          <section>
            <Head label="SKILLS_INSTALLED" hint={`${wallet.skills.length} modules`} />
            <div className="mt-3 space-y-2">
              {wallet.skills.map((s) => (
                <div
                  key={s.name}
                  className={`border ${s.status === "active" ? "border-cyan/40" : "border-orange/40"} bg-black/40 p-3 flex items-center justify-between gap-3`}
                >
                  <div className="min-w-0">
                    <div className="font-display text-base text-foreground truncate">{s.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.12em] mt-0.5">
                      wallet-decided · autonomous
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`tag ${s.status === "active" ? "text-cyan border-cyan/60" : "text-orange border-orange/60"}`}
                    >
                      {s.status === "active" && (
                        <span className="w-1 h-1 rounded-full bg-current live-dot" />
                      )}
                      {s.status}
                    </span>
                    <div className="font-mono text-[10px] text-muted-foreground mt-1">
                      {s.fires} fires
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent executions */}
          <section>
            <Head label="RECENT_EXECUTIONS" hint="last 24h · on-chain" />
            <div className="mt-3 space-y-1.5">
              {wallet.recent.map((r, i) => (
                <div
                  key={i}
                  className="font-mono text-[11px] border-b border-border/50 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-${r.color}`}>{r.action}</span>
                    <span className="text-muted-foreground text-[10px]">{r.t}</span>
                  </div>
                  <div className="text-muted-foreground text-[10px] mt-1 break-all">
                    {r.detail}
                  </div>
                  <div className="text-foreground/60 text-[10px] mt-0.5">
                    tx <span className="text-cyan">{r.tx}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em] flex items-center gap-2 pt-2">
            <Tag color="red">NO HUMAN IN LOOP</Tag>
            <span>read-only · ERC-8004 record</span>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Head({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {">"} {label}
      </div>
      {hint && (
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}
