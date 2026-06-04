import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { getConfig } from "@/lib/config";

function shortAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address, chain, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [error, setError] = useState("");
  const configuredChainId = getConfig().mantleChainId;
  const targetChainId =
    configuredChainId === mantleSepoliaTestnet.id ? mantleSepoliaTestnet.id : mantle.id;
  const targetLabel = targetChainId === mantleSepoliaTestnet.id ? "M-Sepolia" : "Mantle";
  const connector = useMemo(
    () => connectors.find((item) => item.type === "injected") ?? connectors[0],
    [connectors],
  );

  const connectWallet = async () => {
    if (!connector) return;
    setError("");
    try {
      await connectAsync({ connector, chainId: targetChainId });
    } catch (err) {
      setError((err as Error).message || "wallet connection failed");
    }
  };

  const switchToMantle = async () => {
    setError("");
    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (err) {
      setError((err as Error).message || "chain switch failed");
    }
  };

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={connectWallet}
          disabled={!connector || isPending}
          className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 bg-yellow text-black hover:bg-yellow/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Connecting" : "Connect"}
        </button>
        {error && (
          <div className="absolute right-0 top-10 z-40 w-72 border border-red/60 bg-black p-2 font-mono text-[10px] leading-relaxed text-red shadow-lg">
            {error}
          </div>
        )}
      </div>
    );
  }

  const wrongChain = chain?.id !== targetChainId;

  return (
    <div className="relative flex items-center gap-2">
      {wrongChain ? (
        <button
          onClick={switchToMantle}
          disabled={switching}
          className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1.5 border border-red/60 text-red hover:bg-red/10 transition-colors disabled:opacity-50"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red live-dot" />
          {switching ? "Switching" : targetLabel}
        </button>
      ) : (
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1.5 border border-border text-cyan">
          <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
          {targetLabel}
        </div>
      )}
      <button
        onClick={() => disconnect()}
        className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border border-yellow text-yellow hover:bg-yellow hover:text-black transition-colors"
      >
        {shortAddress(address)}
      </button>
      {error && (
        <div className="absolute right-0 top-10 z-40 w-72 border border-red/60 bg-black p-2 font-mono text-[10px] leading-relaxed text-red shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
