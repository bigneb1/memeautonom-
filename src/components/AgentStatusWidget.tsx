import { useEffect, useState } from "react";
import { getConfig } from "@/lib/config";

type Health = {
  ok: boolean;
  latencyMs: number;
  lastSeen: Date | null;
  error?: string;
  payload?: unknown;
};

/**
 * Pings the hosted Byreal agent's /health endpoint every 15s.
 * Configure via VITE_AGENT_URL or /admin.
 */
export function AgentStatusWidget() {
  const [state, setState] = useState<Health>({
    ok: false,
    latencyMs: 0,
    lastSeen: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const cfg = getConfig();
    if (!cfg.agentUrl) {
      setState({ ok: false, latencyMs: 0, lastSeen: null, error: "no VITE_AGENT_URL" });
      return;
    }
    const ctl = new AbortController();
    const start = performance.now();
    const url = cfg.agentUrl.replace(/\/$/, "") + "/health";
    fetch(url, {
      signal: ctl.signal,
      headers: cfg.agentToken
        ? { authorization: `Bearer ${cfg.agentToken}` }
        : undefined,
    })
      .then(async (r) => {
        const latencyMs = Math.round(performance.now() - start);
        let payload: unknown = null;
        try {
          payload = await r.json();
        } catch {
          /* not json */
        }
        setState({
          ok: r.ok,
          latencyMs,
          lastSeen: new Date(),
          error: r.ok ? undefined : `HTTP ${r.status}`,
          payload,
        });
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setState({
          ok: false,
          latencyMs: 0,
          lastSeen: null,
          error: e.message || "network error",
        });
      });
    return () => ctl.abort();
  }, [tick]);

  const color = state.ok ? "text-green border-green/60" : "text-red border-red/60";
  const dot = state.ok ? "bg-green" : "bg-red";

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
          {">"} AGENT_STATUS
        </div>
        <span className={`tag ${color}`}>
          <span className={`w-1 h-1 rounded-full live-dot ${dot}`} />
          {state.ok ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Mini label="LATENCY" value={state.latencyMs ? `${state.latencyMs}ms` : "—"} />
        <Mini
          label="LAST_SEEN"
          value={state.lastSeen ? rel(state.lastSeen) : "—"}
        />
        <Mini label="POLL" value="15s" />
      </div>
      {state.error && (
        <div className="font-mono text-[10px] text-red mt-2 break-all">
          {state.error}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-black/40 p-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-base mt-0.5 text-foreground">{value}</div>
    </div>
  );
}

function rel(d: Date) {
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
