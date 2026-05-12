// Runtime-overridable config. Reads from build-time VITE_* env vars first,
// then falls back to localStorage overrides set via the /admin page.
// This lets you wire endpoints + contract addresses without redeploying.

const LS_KEY = "memeautonom.config.v1";

export type AppConfig = {
  indexerUrl: string;
  agentUrl: string;
  agentToken: string;
  mantleSepoliaRpc: string;
  addresses: {
    identity: string;
    jobRegistry: string;
    skillRegistry: string;
    walletFactory: string;
    usdc: string;
  };
};

const env = import.meta.env;

const DEFAULTS: AppConfig = {
  indexerUrl: (env.VITE_INDEXER_URL as string) || "",
  agentUrl: (env.VITE_AGENT_URL as string) || "",
  agentToken: (env.VITE_AGENT_TOKEN as string) || "",
  mantleSepoliaRpc:
    (env.VITE_MANTLE_SEPOLIA_RPC as string) || "https://rpc.sepolia.mantle.xyz",
  addresses: {
    identity: (env.VITE_IDENTITY_ADDRESS as string) || "",
    jobRegistry: (env.VITE_JOB_REGISTRY_ADDRESS as string) || "",
    skillRegistry: (env.VITE_SKILL_REGISTRY_ADDRESS as string) || "",
    walletFactory: (env.VITE_WALLET_FACTORY_ADDRESS as string) || "",
    usdc: (env.VITE_USDC_ADDRESS as string) || "",
  },
};

function readOverrides(): Partial<AppConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
  } catch {
    return {};
  }
}

export function getConfig(): AppConfig {
  const o = readOverrides();
  return {
    ...DEFAULTS,
    ...o,
    addresses: { ...DEFAULTS.addresses, ...(o.addresses ?? {}) },
  };
}

export function saveConfig(next: Partial<AppConfig>) {
  if (typeof window === "undefined") return;
  const merged = { ...readOverrides(), ...next };
  window.localStorage.setItem(LS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event("memeautonom:config-changed"));
}

export function resetConfig() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY);
  window.dispatchEvent(new Event("memeautonom:config-changed"));
}

export function isHex40(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}
