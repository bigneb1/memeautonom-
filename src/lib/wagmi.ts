import { http, createConfig } from "wagmi";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

// Publishable WalletConnect Cloud project id. Replace with your own at
// https://cloud.walletconnect.com — safe to commit (publishable key).
export const WALLETCONNECT_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined) ||
  "f0d6f8162be1beccf221b4e2f8bd7026";

// Mantle Sepolia RPC. Override with VITE_MANTLE_SEPOLIA_RPC at build time
// (e.g. an Ankr private endpoint). Falls back to the public RPC.
const MANTLE_SEPOLIA_RPC =
  (import.meta.env.VITE_MANTLE_SEPOLIA_RPC as string | undefined) ||
  "https://rpc.sepolia.mantle.xyz";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: "MemeAutonom",
    projectId: WALLETCONNECT_PROJECT_ID,
  }
);

export const wagmiConfig = createConfig({
  chains: [mantle, mantleSepoliaTestnet],
  connectors,
  ssr: true,
  transports: {
    [mantle.id]: http("https://rpc.mantle.xyz"),
    [mantleSepoliaTestnet.id]: http(MANTLE_SEPOLIA_RPC),
  },
});

export const SUPPORTED_CHAINS = [mantle, mantleSepoliaTestnet];
