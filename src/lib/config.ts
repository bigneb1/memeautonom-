// Runtime-overridable config. Reads from build-time VITE_* env vars first,
// then falls back to browser-local overrides for operator diagnostics.
// This lets you wire endpoints + contract addresses without redeploying.

const LS_KEY = "memeautonom.config.v1";

export type AppConfig = {
  indexerUrl: string;
  agentUrl: string;
  mantleChainId: number;
  mantleSepoliaRpc: string;
  mantleRpc: string;
  addresses: {
    identity: string;
    reputation: string;
    validation: string;
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
  mantleChainId: parseChainId(env.VITE_MANTLE_CHAIN_ID, 5000),
  mantleSepoliaRpc: (env.VITE_MANTLE_SEPOLIA_RPC as string) || "https://rpc.sepolia.mantle.xyz",
  mantleRpc: (env.VITE_MANTLE_RPC as string) || "https://rpc.mantle.xyz",
  addresses: {
    identity: (env.VITE_IDENTITY_ADDRESS as string) || "0xe8910a5205695efab09a030b004770303ab4b2b1",
    reputation:
      (env.VITE_REPUTATION_ADDRESS as string) || "0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e",
    validation:
      (env.VITE_VALIDATION_ADDRESS as string) || "0x3dc4de8a358ef667107f45626589d0d02a3d84e3",
    jobRegistry:
      (env.VITE_JOB_REGISTRY_ADDRESS as string) || "0x7f6349a6401f9d5584c34f87d8c4ee01285453da",
    skillRegistry:
      (env.VITE_SKILL_REGISTRY_ADDRESS as string) || "0x27997b8ed551d1f88683c2b02f50a90261fc3b0b",
    walletFactory:
      (env.VITE_WALLET_FACTORY_ADDRESS as string) || "0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7",
    usdc: (env.VITE_USDC_ADDRESS as string) || "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
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

function parseChainId(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
