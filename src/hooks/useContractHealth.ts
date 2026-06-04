import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Address, zeroAddress } from "viem";
import { useConfig, useReadContracts } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import {
  ERC8004_IDENTITY_ABI,
  ERC8004_REPUTATION_ABI,
  JOB_REGISTRY_READ_ABI,
  SKILL_REGISTRY_READ_ABI,
  contractAddress,
} from "@/lib/contracts";
import { getConfig } from "@/lib/config";

type Check = {
  label: string;
  ok: boolean;
  value: string;
};

function sameAddress(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function readResult<T>(data: unknown[] | undefined, index: number): T | undefined {
  const item = data?.[index] as { status?: string; result?: T } | undefined;
  return item?.status === "success" ? item.result : undefined;
}

export function useContractHealth() {
  const wagmiConfig = useConfig();
  const chainId = getConfig().mantleChainId;
  const identity = contractAddress("identity");
  const reputation = contractAddress("reputation");
  const validation = contractAddress("validation");
  const skillRegistry = contractAddress("skillRegistry");
  const jobRegistry = contractAddress("jobRegistry");
  const walletFactory = contractAddress("walletFactory");
  const usdc = contractAddress("usdc");

  const addresses = useMemo(
    () => ({
      identity,
      reputation,
      validation,
      skillRegistry,
      jobRegistry,
      walletFactory,
      usdc,
    }),
    [identity, reputation, validation, skillRegistry, jobRegistry, walletFactory, usdc],
  );

  const codeReads = useQuery({
    queryKey: ["contract-code-health", addresses],
    enabled: Object.values(addresses).some(Boolean),
    queryFn: async () => {
      const client = getPublicClient(wagmiConfig, { chainId });
      if (!client) throw new Error(`No public RPC client configured for chain ${chainId}`);
      const entries = Object.entries(addresses).filter((entry): entry is [string, Address] =>
        Boolean(entry[1]),
      );
      const result: Record<string, boolean> = {};
      for (const [label, address] of entries) {
        const code = await client.getCode({ address });
        result[label] = Boolean(code && code !== "0x");
      }
      return result;
    },
    staleTime: 30_000,
  });

  const wiringReads = useReadContracts({
    contracts:
      identity && reputation && skillRegistry && jobRegistry && walletFactory
        ? [
            {
              address: identity,
              abi: ERC8004_IDENTITY_ABI,
              functionName: "registrar",
              args: [walletFactory],
              chainId,
            },
            {
              address: reputation,
              abi: ERC8004_REPUTATION_ABI,
              functionName: "reporter",
              args: [skillRegistry],
              chainId,
            },
            {
              address: reputation,
              abi: ERC8004_REPUTATION_ABI,
              functionName: "reporter",
              args: [jobRegistry],
              chainId,
            },
            {
              address: skillRegistry,
              abi: SKILL_REGISTRY_READ_ABI,
              functionName: "reputationRegistry",
              chainId,
            },
            {
              address: jobRegistry,
              abi: JOB_REGISTRY_READ_ABI,
              functionName: "reputationRegistry",
              chainId,
            },
            {
              address: jobRegistry,
              abi: JOB_REGISTRY_READ_ABI,
              functionName: "usdc",
              chainId,
            },
            {
              address: jobRegistry,
              abi: JOB_REGISTRY_READ_ABI,
              functionName: "feeSink",
              chainId,
            },
            {
              address: jobRegistry,
              abi: JOB_REGISTRY_READ_ABI,
              functionName: "feeBps",
              chainId,
            },
          ]
        : [],
    query: {
      enabled: Boolean(identity && reputation && skillRegistry && jobRegistry && walletFactory),
    },
  });

  const factoryRegistrar = readResult<boolean>(wiringReads.data, 0);
  const skillReporter = readResult<boolean>(wiringReads.data, 1);
  const jobReporter = readResult<boolean>(wiringReads.data, 2);
  const skillReputation = readResult<Address>(wiringReads.data, 3);
  const jobReputation = readResult<Address>(wiringReads.data, 4);
  const jobUsdc = readResult<Address>(wiringReads.data, 5);
  const feeSink = readResult<Address>(wiringReads.data, 6);
  const feeBps = readResult<number>(wiringReads.data, 7);

  const code = codeReads.data ?? {};
  const addressChecks: Check[] = [
    {
      label: "Identity code",
      ok: Boolean(identity && code.identity),
      value: identity ?? "missing",
    },
    {
      label: "Reputation code",
      ok: Boolean(reputation && code.reputation),
      value: reputation ?? "missing",
    },
    {
      label: "Validation code",
      ok: Boolean(validation && code.validation),
      value: validation ?? "missing",
    },
    {
      label: "SkillRegistry code",
      ok: Boolean(skillRegistry && code.skillRegistry),
      value: skillRegistry ?? "missing",
    },
    {
      label: "JobRegistry code",
      ok: Boolean(jobRegistry && code.jobRegistry),
      value: jobRegistry ?? "missing",
    },
    {
      label: "WalletFactory code",
      ok: Boolean(walletFactory && code.walletFactory),
      value: walletFactory ?? "missing",
    },
    {
      label: "USDC code",
      ok: Boolean(usdc && code.usdc),
      value: usdc ?? "missing",
    },
  ];

  const wiringChecks: Check[] = [
    {
      label: "Factory registrar",
      ok: factoryRegistrar === true,
      value: factoryRegistrar === undefined ? "not readable" : String(factoryRegistrar),
    },
    {
      label: "Skill reporter",
      ok: skillReporter === true,
      value: skillReporter === undefined ? "not readable" : String(skillReporter),
    },
    {
      label: "Job reporter",
      ok: jobReporter === true,
      value: jobReporter === undefined ? "not readable" : String(jobReporter),
    },
    {
      label: "Skill reputation",
      ok: sameAddress(skillReputation, reputation),
      value: skillReputation ?? zeroAddress,
    },
    {
      label: "Job reputation",
      ok: sameAddress(jobReputation, reputation),
      value: jobReputation ?? zeroAddress,
    },
    {
      label: "Job USDC",
      ok: sameAddress(jobUsdc, usdc),
      value: jobUsdc ?? zeroAddress,
    },
    {
      label: "Fee sink",
      ok: Boolean(feeSink && feeSink !== zeroAddress),
      value: feeSink ?? zeroAddress,
    },
    {
      label: "Fee",
      ok: typeof feeBps === "number" || typeof feeBps === "bigint",
      value: feeBps === undefined ? "not readable" : `${feeBps.toString()} bps`,
    },
  ];

  const checks = [...addressChecks, ...wiringChecks];
  const passed = checks.filter((check) => check.ok).length;

  return {
    addresses,
    checks,
    addressChecks,
    wiringChecks,
    chainId,
    passed,
    total: checks.length,
    ready: checks.length > 0 && passed === checks.length,
    isLoading: wiringReads.isLoading || codeReads.isLoading,
  };
}
