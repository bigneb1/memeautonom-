import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tag } from "@/components/Tag";
import { AgentStatusWidget } from "@/components/AgentStatusWidget";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { getConfig, saveConfig, resetConfig, isHex40, type AppConfig } from "@/lib/config";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({
    meta: [
      { title: "Admin · MemeAutonom" },
      {
        name: "description",
        content: "Configure indexer URL, agent endpoint, and on-chain addresses.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function Admin() {
  const [cfg, setCfg] = useState<AppConfig>(() => getConfig());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onChange = () => setCfg(getConfig());
    window.addEventListener("memeautonom:config-changed", onChange);
    return () => window.removeEventListener("memeautonom:config-changed", onChange);
  }, []);

  const update = (patch: Partial<AppConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const updateAddr = (k: keyof AppConfig["addresses"], v: string) =>
    setCfg((c) => ({ ...c, addresses: { ...c.addresses, [k]: v } }));

  const onSave = () => {
    saveConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const onReset = () => {
    if (
      confirm(
        "Reset all overrides? This clears localStorage values and reverts to build-time env defaults.",
      )
    ) {
      resetConfig();
      setCfg(getConfig());
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Tag color="red">ADMIN</Tag>
          <Tag color="yellow">LOCAL_OVERRIDES</Tag>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-foreground leading-[0.95]">
          Settings & <span className="font-serif-italic text-yellow font-normal">diagnostics</span>.
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-3 max-w-2xl">
          Values are stored in this browser's localStorage and override build-time
          <code className="text-cyan"> VITE_*</code> env vars at runtime. To make changes permanent
          for all visitors, set them as build env vars (see INTEGRATION.md → "Wire to build/deploy"
          below).
        </p>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <Field
          label="VITE_INDEXER_URL"
          hint="GraphQL endpoint (Envio / The Graph)"
          value={cfg.indexerUrl}
          onChange={(v) => update({ indexerUrl: v })}
          placeholder="https://indexer.bigdevenergy.link/abcd1234/v1/graphql"
        />
        <Field
          label="VITE_AGENT_URL"
          hint="Hosted agent runtime base URL (no trailing slash)"
          value={cfg.agentUrl}
          onChange={(v) => update({ agentUrl: v })}
          placeholder="https://my-agent.fly.dev"
        />
        <Field
          label="VITE_MANTLE_CHAIN_ID"
          hint="5003 for Sepolia demo, 5000 for Mantle mainnet"
          value={String(cfg.mantleChainId)}
          onChange={(v) => update({ mantleChainId: Number(v) || 5003 })}
          placeholder="5003"
        />
        <Field
          label="VITE_MANTLE_SEPOLIA_RPC"
          hint="Override Mantle Sepolia RPC URL"
          value={cfg.mantleSepoliaRpc}
          onChange={(v) => update({ mantleSepoliaRpc: v })}
          placeholder="https://rpc.sepolia.mantle.xyz"
        />
        <Field
          label="VITE_MANTLE_RPC"
          hint="Override Mantle mainnet RPC URL"
          value={cfg.mantleRpc}
          onChange={(v) => update({ mantleRpc: v })}
          placeholder="https://rpc.mantle.xyz"
        />
      </section>

      <section className="panel p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground border-b border-border pb-2 mb-4">
          {">"} CONTRACT_ADDRESSES · MANTLE
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <AddrField
            label="VITE_IDENTITY_ADDRESS"
            value={cfg.addresses.identity}
            onChange={(v) => updateAddr("identity", v)}
          />
          <AddrField
            label="VITE_REPUTATION_ADDRESS"
            value={cfg.addresses.reputation}
            onChange={(v) => updateAddr("reputation", v)}
          />
          <AddrField
            label="VITE_VALIDATION_ADDRESS"
            value={cfg.addresses.validation}
            onChange={(v) => updateAddr("validation", v)}
          />
          <AddrField
            label="VITE_JOB_REGISTRY_ADDRESS"
            value={cfg.addresses.jobRegistry}
            onChange={(v) => updateAddr("jobRegistry", v)}
          />
          <AddrField
            label="VITE_SKILL_REGISTRY_ADDRESS"
            value={cfg.addresses.skillRegistry}
            onChange={(v) => updateAddr("skillRegistry", v)}
          />
          <AddrField
            label="VITE_WALLET_FACTORY_ADDRESS"
            value={cfg.addresses.walletFactory}
            onChange={(v) => updateAddr("walletFactory", v)}
          />
          <AddrField
            label="VITE_USDC_ADDRESS"
            value={cfg.addresses.usdc}
            onChange={(v) => updateAddr("usdc", v)}
          />
        </div>
      </section>

      <section className="flex items-center gap-3">
        <button
          onClick={onSave}
          className="tag text-yellow border-yellow/60 hover:bg-yellow/10 px-4 py-2"
        >
          {saved ? "✓ SAVED" : "SAVE_OVERRIDES"}
        </button>
        <button
          onClick={onReset}
          className="tag text-muted-foreground border-border hover:text-red hover:border-red/60 px-4 py-2"
        >
          RESET
        </button>
        <span className="font-mono text-[10px] text-muted-foreground">
          stored in localStorage · this browser only
        </span>
      </section>

      <section className="grid lg:grid-cols-2 gap-5">
        <AgentStatusWidget />
        <DiagnosticsPanel />
      </section>

      <section className="panel p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground border-b border-border pb-2 mb-4">
          {">"} WIRE_TO_BUILD_AND_DEPLOY
        </div>
        <ol className="space-y-3 font-mono text-[11px] text-muted-foreground leading-relaxed list-decimal list-inside">
          <li>
            <span className="text-foreground">Local dev:</span> create a{" "}
            <code className="text-cyan">.env.local</code> at the project root (gitignored) and paste
            each <code className="text-cyan">VITE_*</code> from above. Restart{" "}
            <code className="text-cyan">npm run dev</code>.
          </li>
          <li>
            <span className="text-foreground">Lovable Cloud / hosted:</span> open Project → Settings
            → <span className="text-yellow">Build Secrets</span> and add each{" "}
            <code className="text-cyan">VITE_*</code> key + value. Republish.
          </li>
          <li>
            <span className="text-foreground">Self-hosted (Vercel / Netlify / Cloudflare):</span>{" "}
            add the same keys under that platform's "Environment Variables" for the build
            environment. Re-deploy.
          </li>
          <li>
            <span className="text-foreground">Verify:</span> after a fresh build, click
            <span className="text-yellow"> RESET</span> above, then{" "}
            <span className="text-yellow">RUN_PROBES</span> in the diagnostics panel. All probes
            should return <span className="text-green">OK</span>.
          </li>
        </ol>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-1">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">
          {label}
        </label>
        {value && <span className="font-mono text-[9px] text-green">SET</span>}
      </div>
      <div className="font-mono text-[10px] text-muted-foreground mb-2">{hint}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-border focus:border-yellow/60 outline-none px-3 py-2 font-mono text-[11px] text-foreground"
      />
    </div>
  );
}

function AddrField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = !value || isHex40(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">
          {label}
        </label>
        <span
          className={`font-mono text-[9px] ${
            !value ? "text-muted-foreground" : valid ? "text-green" : "text-red"
          }`}
        >
          {!value ? "EMPTY" : valid ? "VALID" : "INVALID"}
        </span>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="0x…"
        className={`w-full bg-black border outline-none px-3 py-2 font-mono text-[11px] text-foreground ${
          valid ? "border-border focus:border-yellow/60" : "border-red/60"
        }`}
      />
    </div>
  );
}
