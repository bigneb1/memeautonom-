import { type Address, parseAbi } from "viem";
import { getConfig, isHex40 } from "./config";

export function contractAddress(
  key: keyof ReturnType<typeof getConfig>["addresses"],
): Address | undefined {
  const value = getConfig().addresses[key];
  return isHex40(value) ? (value as Address) : undefined;
}

export const AGENTIC_WALLET_FACTORY_ABI = parseAbi([
  "function deploy(address owner, address signer, uint256 salt, string uri) returns (address wallet)",
  "function predict(address owner, address signer, uint256 salt) view returns (address)",
  "event WalletCreated(address indexed wallet, address indexed owner, address indexed signer, uint256 salt)",
]);

export const AGENTIC_WALLET_ABI = parseAbi([
  "function setTargetAllowed(address target, bool allowed)",
  "function setSelectorAllowed(address target, bytes4 selector, bool allowed)",
  "function setSkillLimits(bytes32 skillId, uint128 maxCallAmount, uint128 dailySpendLimit, bool enabled)",
  "function executeSkill(bytes32 skillId, address to, uint256 value, bytes data) returns (bytes)",
  "function signer() view returns (address)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
]);

export const SKILL_REGISTRY_ABI = parseAbi([
  "function publish(string name, string uri) returns (bytes32 id)",
  "function install(bytes32 id)",
  "function setStatus(bytes32 id, uint8 status)",
  "function fire(bytes32 id, bytes32 actionHash)",
]);

export const ERC8004_IDENTITY_ABI = parseAbi([
  "function identities(address wallet) view returns (uint256 id, string uri, uint64 registeredAt, uint64 updatedAt)",
  "function controllerOf(address wallet) view returns (address)",
  "function ownerOf(uint256 id) view returns (address)",
  "function nextId() view returns (uint256)",
  "function registrar(address account) view returns (bool)",
]);

export const ERC8004_REPUTATION_ABI = parseAbi([
  "function scoreOf(address wallet) view returns (int256)",
  "function recordCount(address wallet) view returns (uint256)",
  "function nextRecordId() view returns (uint256)",
  "function getIdentityRegistry() view returns (address)",
  "function reporter(address account) view returns (bool)",
]);

export const SKILL_REGISTRY_READ_ABI = parseAbi([
  "function reputationRegistry() view returns (address)",
]);

export const JOB_REGISTRY_READ_ABI = parseAbi([
  "function reputationRegistry() view returns (address)",
  "function usdc() view returns (address)",
  "function feeSink() view returns (address)",
  "function feeBps() view returns (uint16)",
]);
