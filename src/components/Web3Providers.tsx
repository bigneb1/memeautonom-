import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  type Theme,
} from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const customTheme: Theme = {
  ...darkTheme({
    accentColor: "#e8ff47",
    accentColorForeground: "#000000",
    borderRadius: "small",
    fontStack: "system",
    overlayBlur: "small",
  }),
};

export function Web3Providers({ children }: { children: ReactNode }) {
  // RainbowKit / wagmi rely on browser APIs (indexedDB, WalletConnect).
  // Render only on the client to avoid SSR crashes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
