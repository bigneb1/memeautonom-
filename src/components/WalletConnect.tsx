import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <button
              disabled
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border border-border text-muted-foreground"
            >
              ...
            </button>
          );
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 bg-yellow text-black hover:bg-yellow/90 transition-colors"
            >
              Connect
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 bg-red text-black hover:opacity-90 transition-opacity"
            >
              Wrong Network
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={openChainModal}
              className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1.5 border border-border text-cyan hover:border-cyan/60 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
              {chain.name.replace("Mantle ", "M-")}
            </button>
            <button
              onClick={openAccountModal}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border border-yellow text-yellow hover:bg-yellow hover:text-black transition-colors"
            >
              {account.displayName}
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
