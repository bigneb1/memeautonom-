import { useContractHealth } from "@/hooks/useContractHealth";

export function ContractHealthPanel({ compact = false }: { compact?: boolean }) {
  const health = useContractHealth();
  const visibleChecks = compact ? health.checks.slice(0, 8) : health.checks;

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
            {">"} PRODUCTION_CONTRACT_HEALTH
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Mantle {health.chainId} · direct RPC checks
          </div>
        </div>
        <div
          className={`tag ${
            health.ready ? "border-green/60 text-green" : "border-orange/60 text-orange"
          }`}
        >
          {health.isLoading ? "CHECKING" : `${health.passed}/${health.total} OK`}
        </div>
      </div>
      <div
        className={`mt-4 grid gap-2 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {visibleChecks.map((check) => (
          <div key={check.label} className="border border-border bg-black/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {check.label}
              </div>
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  check.ok ? "bg-green" : "bg-orange"
                }`}
              />
            </div>
            <div className="mt-1 break-all font-mono text-[10px] text-foreground">
              {check.value}
            </div>
          </div>
        ))}
      </div>
      {compact && health.checks.length > visibleChecks.length && (
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {health.checks.length - visibleChecks.length} more checks available on demo
        </div>
      )}
    </div>
  );
}
