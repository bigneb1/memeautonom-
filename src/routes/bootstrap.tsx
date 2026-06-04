import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useChainId, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { mantle, mantleSepoliaTestnet } from "wagmi/chains";
import { Tag } from "@/components/Tag";
import { AGENTIC_WALLET_ABI, SKILL_REGISTRY_ABI, contractAddress } from "@/lib/contracts";

export const Route = createFileRoute("/bootstrap")({
  component: BootstrapSkillPolicy,
  head: () => ({
    meta: [
      { title: "Skill Policy Bootstrap · MemeAutonom" },
      {
        name: "description",
        content: "Install a bounded skill and bootstrap AgenticWallet policy limits.",
      },
    ],
  }),
});

const FIRE_SELECTOR = "0xa9363859"; // SkillRegistry.fire(bytes32,bytes32)
const INSTALL_SELECTOR = "0x12f8740a"; // SkillRegistry.install(bytes32)

function BootstrapSkillPolicy() {
  const chainId = useChainId();
  const { writeContractAsync, isPending } = useWriteContract();
  const [wallet, setWallet] = useState("");
  const [skillId, setSkillId] = useState("");
  const [maxCall, setMaxCall] = useState("0");
  const [daily, setDaily] = useState("0");
  const [lastTx, setLastTx] = useState("");
  const skillRegistry = contractAddress("skillRegistry");
  const validWallet = isAddress(wallet);
  const validSkill = /^0x[a-fA-F0-9]{64}$/.test(skillId);
  const demoReady = chainId === mantleSepoliaTestnet.id;
  const mainnetSelected = chainId === mantle.id;
  const supportedChain = demoReady || mainnetSelected;

  const send = async (label: string, fn: () => Promise<`0x${string}`>) => {
    const hash = await fn();
    setLastTx(`${label}: ${hash}`);
  };

  const setTarget = () =>
    send("target", () =>
      writeContractAsync({
        address: wallet as Address,
        abi: AGENTIC_WALLET_ABI,
        functionName: "setTargetAllowed",
        args: [skillRegistry!, true],
      }),
    );

  const setSelectors = async () => {
    await send("install-selector", () =>
      writeContractAsync({
        address: wallet as Address,
        abi: AGENTIC_WALLET_ABI,
        functionName: "setSelectorAllowed",
        args: [skillRegistry!, INSTALL_SELECTOR, true],
      }),
    );
    await send("fire-selector", () =>
      writeContractAsync({
        address: wallet as Address,
        abi: AGENTIC_WALLET_ABI,
        functionName: "setSelectorAllowed",
        args: [skillRegistry!, FIRE_SELECTOR, true],
      }),
    );
  };

  const setLimits = () =>
    send("limits", () =>
      writeContractAsync({
        address: wallet as Address,
        abi: AGENTIC_WALLET_ABI,
        functionName: "setSkillLimits",
        args: [skillId as `0x${string}`, BigInt(maxCall || "0"), BigInt(daily || "0"), true],
      }),
    );

  const installSkill = () =>
    send("install", () =>
      writeContractAsync({
        address: wallet as Address,
        abi: AGENTIC_WALLET_ABI,
        functionName: "executeSkill",
        args: [
          skillId as `0x${string}`,
          skillRegistry!,
          0n,
          encodeInstallCall(skillId as `0x${string}`),
        ],
      }),
    );

  const disabled = !supportedChain || !skillRegistry || !validWallet || !validSkill || isPending;
  const command = [
    "WALLET_ADDRESS=" + (wallet || "0x..."),
    "TARGET_ADDRESS=" + (skillRegistry || "0x..."),
    `SELECTORS=${INSTALL_SELECTOR},${FIRE_SELECTOR}`,
    "SKILL_ID=" + (skillId || "0x..."),
    "SKILL_MAX_CALL_AMOUNT=" + (maxCall || "0"),
    "SKILL_DAILY_LIMIT=" + (daily || "0"),
    "npm run wallet:bootstrap",
  ].join(" ");

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tag color="cyan">SKILL POLICY</Tag>
          <Tag color={demoReady ? "green" : mainnetSelected ? "red" : "yellow"}>
            {demoReady ? "MANTLE SEPOLIA" : mainnetSelected ? "MANTLE MAINNET" : "SWITCH TO MANTLE"}
          </Tag>
        </div>
        <h1 className="font-display text-4xl leading-none text-foreground md:text-5xl">
          Bootstrap one{" "}
          <span className="font-serif-italic text-yellow font-normal">bounded skill</span>.
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
          The wallet no longer has a generic execute surface. Every runtime action must pass through
          executeSkill(skillId, target, value, data) and a matching skill policy.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel space-y-4 p-5">
          <Input
            label="AgenticWallet address"
            value={wallet}
            onChange={setWallet}
            placeholder="0x..."
          />
          <Input
            label="Skill ID bytes32"
            value={skillId}
            onChange={setSkillId}
            placeholder="0x..."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Max call amount" value={maxCall} onChange={setMaxCall} placeholder="0" />
            <Input label="Daily spend limit" value={daily} onChange={setDaily} placeholder="0" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Action label="1_ALLOW_TARGET" onClick={setTarget} disabled={disabled} />
            <Action label="2_ALLOW_SELECTORS" onClick={setSelectors} disabled={disabled} />
            <Action label="3_SET_SKILL_LIMITS" onClick={setLimits} disabled={disabled} />
            <Action label="4_INSTALL_SKILL" onClick={installSkill} disabled={disabled} />
          </div>
          {lastTx && <div className="break-all font-mono text-[11px] text-green">{lastTx}</div>}
          {mainnetSelected && (
            <div className="font-mono text-[11px] text-yellow">
              Mainnet policy bootstrap is live. Use zero native/token spend for proof skills, then
              raise limits only after runtime simulation succeeds.
            </div>
          )}
          {!supportedChain && (
            <div className="font-mono text-[11px] text-red">
              Switch to Mantle Sepolia or Mantle mainnet for policy bootstrap.
            </div>
          )}
        </div>

        <aside className="panel h-fit space-y-4 p-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">
              Script equivalent
            </div>
            <pre className="mt-2 whitespace-pre-wrap break-all border border-border bg-black/60 p-3 font-mono text-[10px] text-cyan">
              {command}
            </pre>
          </div>
          <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            Use the UI for owner-wallet transactions. Use the script only with local env vars; never
            paste PRIVATE_KEY or AGENT_PRIVATE_KEY into a browser or chat.
          </div>
        </aside>
      </section>
    </div>
  );
}

function encodeInstallCall(skillId: `0x${string}`): `0x${string}` {
  const padded = skillId.slice(2).padStart(64, "0");
  return `${INSTALL_SELECTOR}${padded}` as `0x${string}`;
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder={placeholder}
        className="mt-1 w-full border border-border bg-black px-3 py-2 font-mono text-[11px] text-foreground outline-none focus:border-yellow/60"
      />
    </label>
  );
}

function Action({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="tag border-yellow/60 px-3 py-2 text-yellow hover:bg-yellow/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
