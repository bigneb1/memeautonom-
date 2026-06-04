import { type Address, zeroAddress } from "viem";
import { useBalance, useBlockNumber, useChainId, useReadContract, useReadContracts } from "wagmi";
import {
  AGENTIC_WALLET_FACTORY_ABI,
  ERC8004_IDENTITY_ABI,
  ERC8004_REPUTATION_ABI,
  contractAddress,
} from "@/lib/contracts";

type IdentityTuple = readonly [bigint, string, bigint, bigint];

export function useOnchainAgentStatus(address?: Address) {
  const chainId = useChainId();
  const identityAddress = contractAddress("identity");
  const reputationAddress = contractAddress("reputation");
  const walletFactoryAddress = contractAddress("walletFactory");

  const { data: balance, isLoading: balanceLoading } = useBalance({ address, chainId });
  const { data: blockNumber, isLoading: blockLoading } = useBlockNumber({
    query: { refetchInterval: 12_000 },
  });

  const identityReads = useReadContracts({
    contracts:
      address && identityAddress
        ? [
            {
              address: identityAddress,
              abi: ERC8004_IDENTITY_ABI,
              functionName: "identities",
              args: [address],
            },
            {
              address: identityAddress,
              abi: ERC8004_IDENTITY_ABI,
              functionName: "controllerOf",
              args: [address],
            },
          ]
        : [],
    query: { enabled: Boolean(address && identityAddress) },
  });

  const reputationReads = useReadContracts({
    contracts:
      address && reputationAddress
        ? [
            {
              address: reputationAddress,
              abi: ERC8004_REPUTATION_ABI,
              functionName: "scoreOf",
              args: [address],
            },
            {
              address: reputationAddress,
              abi: ERC8004_REPUTATION_ABI,
              functionName: "recordCount",
              args: [address],
            },
          ]
        : [],
    query: { enabled: Boolean(address && reputationAddress) },
  });

  const { data: factoryNextWallet } = useReadContract({
    address: walletFactoryAddress,
    abi: AGENTIC_WALLET_FACTORY_ABI,
    functionName: "predict",
    args: address ? [address, address, 1n] : undefined,
    query: { enabled: Boolean(address && walletFactoryAddress) },
  });

  const identityResult = identityReads.data?.[0];
  const controllerResult = identityReads.data?.[1];
  const scoreResult = reputationReads.data?.[0];
  const recordCountResult = reputationReads.data?.[1];
  const identity =
    identityResult?.status === "success" ? (identityResult.result as IdentityTuple) : undefined;
  const controller =
    controllerResult?.status === "success" ? (controllerResult.result as Address) : undefined;
  const identityId = identity?.[0] ?? 0n;

  return {
    chainId,
    balance,
    blockNumber,
    identityAddress,
    reputationAddress,
    walletFactoryAddress,
    hasIdentity: identityId > 0n,
    identityId,
    identityUri: identity?.[1] ?? "",
    registeredAt: identity?.[2] ?? 0n,
    updatedAt: identity?.[3] ?? 0n,
    controller: controller && controller !== zeroAddress ? controller : undefined,
    score: scoreResult?.status === "success" ? (scoreResult.result as bigint) : undefined,
    recordCount:
      recordCountResult?.status === "success" ? (recordCountResult.result as bigint) : undefined,
    predictedWallet: factoryNextWallet as Address | undefined,
    isLoading:
      balanceLoading || blockLoading || identityReads.isLoading || reputationReads.isLoading,
    hasConfiguredContracts: Boolean(identityAddress && reputationAddress && walletFactoryAddress),
  };
}
