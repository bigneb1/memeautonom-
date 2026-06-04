import { http, createConfig } from "wagmi";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Mantle RPC endpoints. Override with VITE_MANTLE_RPC / VITE_MANTLE_SEPOLIA_RPC
// at build time (e.g. private endpoints). Falls back to public RPCs.
const MANTLE_RPC =
  (import.meta.env.VITE_MANTLE_RPC as string | undefined) || "https://rpc.mantle.xyz";
const MANTLE_SEPOLIA_RPC =
  (import.meta.env.VITE_MANTLE_SEPOLIA_RPC as string | undefined) ||
  "https://rpc.sepolia.mantle.xyz";

export const wagmiConfig = createConfig({
  chains: [mantle, mantleSepoliaTestnet],
  connectors: [injected({ shimDisconnect: true, unstable_shimAsyncInject: 1_000 })],
  ssr: true,
  transports: {
    [mantle.id]: http(MANTLE_RPC),
    [mantleSepoliaTestnet.id]: http(MANTLE_SEPOLIA_RPC),
  },
});

export const SUPPORTED_CHAINS = [mantle, mantleSepoliaTestnet];
