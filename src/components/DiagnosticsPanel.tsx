import { useState } from "react";
import { GraphQLClient, gql } from "graphql-request";
import { getConfig } from "@/lib/config";

type Probe = {
  name: string;
  query: string;
  expectFields: string[]; // dotted paths under data.X[0]
  rootField: string;
};

const PROBES: Probe[] = [
  {
    name: "leaderboard",
    rootField: "wallets",
    query: `query Probe { wallets(first: 1, orderBy: reputation, orderDirection: desc) {
      address role reputation jobsCompleted volumeUsdc autonomyScore activatedAt
    } }`,
    expectFields: [
      "address",
      "role",
      "reputation",
      "jobsCompleted",
      "volumeUsdc",
      "autonomyScore",
    ],
  },
  {
    name: "skills_per_wallet",
    rootField: "wallets",
    query: `query Probe { wallets(first: 1) {
      address skills { name status fires }
    } }`,
    expectFields: ["address", "skills"],
  },
  {
    name: "executions_feed",
    rootField: "executions",
    query: `query Probe { executions(first: 1, orderBy: timestamp, orderDirection: desc) {
      timestamp action detail txHash color
    } }`,
    expectFields: ["timestamp", "action", "detail", "txHash"],
  },
];

type Result = {
  name: string;
  ok: boolean;
  latencyMs: number;
  missing: string[];
  error?: string;
  count?: number;
};

export function DiagnosticsPanel() {
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    const cfg = getConfig();
    if (!cfg.indexerUrl) {
      setResults([
        {
          name: "config",
          ok: false,
          latencyMs: 0,
          missing: [],
          error: "VITE_INDEXER_URL not set (configure at /admin)",
        },
      ]);
      return;
    }
    setRunning(true);
    const client = new GraphQLClient(cfg.indexerUrl);
    const out: Result[] = [];
    for (const p of PROBES) {
      const t0 = performance.now();
      try {
        const data = await client.request<Record<string, unknown[]>>(gql`${p.query}`);
        const latencyMs = Math.round(performance.now() - t0);
        const arr = (data?.[p.rootField] as unknown[]) ?? [];
        const sample = (arr[0] as Record<string, unknown>) || {};
        const missing = arr.length === 0
          ? []
          : p.expectFields.filter((f) => !(f in sample));
        out.push({
          name: p.name,
          ok: missing.length === 0,
          latencyMs,
          missing,
          count: arr.length,
        });
      } catch (e) {
        out.push({
          name: p.name,
          ok: false,
          latencyMs: Math.round(performance.now() - t0),
          missing: [],
          error: (e as Error).message.slice(0, 240),
        });
      }
      setResults([...out]);
    }
    setRunning(false);
  };

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
          {">"} INDEXER_DIAGNOSTICS
        </div>
        <button
          onClick={run}
          disabled={running}
          className="tag text-yellow border-yellow/60 hover:bg-yellow/10 disabled:opacity-40"
        >
          {running ? "RUNNING…" : "RUN_PROBES"}
        </button>
      </div>
      <div className="font-mono text-[10px] text-muted-foreground mb-3 break-all">
        endpoint: {getConfig().indexerUrl || "—"}
      </div>
      {results.length === 0 ? (
        <div className="font-mono text-[11px] text-muted-foreground py-4 text-center border border-dashed border-border">
          no probes run yet
        </div>
      ) : (
        <ul className="space-y-1.5">
          {results.map((r) => (
            <li
              key={r.name}
              className="border border-border bg-black/30 px-3 py-2 font-mono text-[11px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-foreground">{r.name}</span>
                <span
                  className={
                    r.ok
                      ? "text-green"
                      : r.error
                      ? "text-red"
                      : "text-orange"
                  }
                >
                  {r.ok ? "OK" : r.error ? "ERROR" : "SCHEMA_MISMATCH"} ·{" "}
                  {r.latencyMs}ms
                </span>
              </div>
              {typeof r.count === "number" && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  rows: {r.count}
                </div>
              )}
              {r.missing.length > 0 && (
                <div className="text-[10px] text-orange mt-0.5">
                  missing fields: {r.missing.join(", ")}
                </div>
              )}
              {r.error && (
                <div className="text-[10px] text-red mt-0.5 break-all">
                  {r.error}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
