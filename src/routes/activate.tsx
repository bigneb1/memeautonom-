import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { Tag } from "@/components/Tag";
import { AGENTIC_WALLET_FACTORY_ABI, contractAddress } from "@/lib/contracts";

export const Route = createFileRoute("/activate")({
  component: ActivateAgentWallet,
  head: () => ({
    meta: [
      { title: "Activate Agent Wallet · MemeAutonom" },
      {
        name: "description",
        content: "Deploy a policy-limited agent wallet and register its ERC-8004-style identity.",
      },
    ],
  }),
});

function ActivateAgentWallet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const [signer, setSigner] = useState("");
  const [salt, setSalt] = useState("1");
  const [uri, setUri] = useState("ipfs://agent.json");
  const [txHash, setTxHash] = useState("");
  const factory = contractAddress("walletFactory");
  const owner = address as Address | undefined;
  const saltBigInt = useMemo(() => {
    try {
      return BigInt(salt || "0");
    } catch {
      return 0n;
    }
  }, [salt]);
  const validSigner = isAddress(signer);
  const demoReady = chainId === mantleSepoliaTestnet.id;
  const mainnetSelected = chainId === mantle.id;
  const supportedChain = demoReady || mainnetSelected;

  const { data: predicted } = useReadContract({
    address: factory,
    abi: AGENTIC_WALLET_FACTORY_ABI,
    functionName: "predict",
    args: owner && validSigner ? [owner, signer as Address, saltBigInt] : undefined,
    query: { enabled: Boolean(factory && owner && validSigner) },
  });

  const deploy = async () => {
    if (!factory || !owner || !validSigner) return;
    const hash = await writeContractAsync({
      address: factory,
      abi: AGENTIC_WALLET_FACTORY_ABI,
      functionName: "deploy",
      args: [owner, signer as Address, saltBigInt, uri.trim()],
    });
    setTxHash(hash);
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tag color="cyan">AGENT WALLET</Tag>
          <Tag color={demoReady ? "green" : mainnetSelected ? "red" : "yellow"}>
            {demoReady
              ? "MANTLE SEPOLIA DEMO"
              : mainnetSelected
                ? "MAINNET SELECTED"
                : "SWITCH TO MANTLE"}
          </Tag>
        </div>
        <h1 className="font-display text-4xl leading-none text-foreground md:text-5xl">
          Activate a{" "}
          <span className="font-serif-italic text-yellow font-normal">policy wallet</span>.
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
          This calls AgenticWalletFactory.deploy(owner, signer, salt, uri). Keep Sepolia as the
          proof target until the full loop is green; use mainnet only after the same policy and
          indexer checks pass.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel space-y-4 p-5">
          <Field label="Owner wallet" value={owner ?? ""} readOnly />
          <Field
            label="Runtime signer"
            value={signer}
            onChange={setSigner}
            placeholder="0x..."
            error={signer && !validSigner ? "invalid signer address" : ""}
          />
          <Field label="CREATE2 salt" value={salt} onChange={setSalt} placeholder="1" />
          <Field
            label="Identity metadata URI"
            value={uri}
            onChange={setUri}
            placeholder="ipfs://agent.json"
          />
          <button
            onClick={deploy}
            disabled={!factory || !owner || !validSigner || isPending || !supportedChain}
            className="tag border-yellow/60 px-4 py-2 text-yellow hover:bg-yellow/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "CONFIRMING..." : "DEPLOY_AGENT_WALLET"}
          </button>
          {mainnetSelected && (
            <p className="font-mono text-[11px] text-yellow">
              You are deploying on Mantle mainnet. Confirm the production health checks are green
              and keep runtime policies narrow before funding the wallet.
            </p>
          )}
          {!supportedChain && (
            <p className="font-mono text-[11px] text-red">
              Deployment is disabled unless your wallet is on Mantle Sepolia or Mantle mainnet.
              Mainnet scripts still require ALLOW_MAINNET=1 and local env keys.
            </p>
          )}
        </div>

        <aside className="panel h-fit space-y-4 p-5">
          <Summary label="Factory" value={factory ?? "not configured"} />
          <Summary
            label="Predicted wallet"
            value={(predicted as string | undefined) ?? "enter signer"}
          />
          <Summary label="Deploy tx" value={txHash || "—"} />
          <div className="border border-border bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            After deploy, open{" "}
            <Link to="/bootstrap" className="text-yellow hover:text-cyan">
              Skill Bootstrap
            </Link>{" "}
            to install a skill and allow only that skill's target, selector, and spend cap.
          </div>
        </aside>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  error,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value.trim())}
        placeholder={placeholder}
        readOnly={readOnly}
        className="mt-1 w-full border border-border bg-black px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-yellow/60"
      />
      {error && <span className="mt-1 block font-mono text-[10px] text-red">{error}</span>}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-all font-mono text-[11px] text-foreground">{value}</div>
    </div>
  );
}
