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
export const WALLETCONNECT_PROJECT_ID = "3fbb6bae6f1de962d911bb5b5c3dba68";

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
    [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
  },
});

export const SUPPORTED_CHAINS = [mantle, mantleSepoliaTestnet];
