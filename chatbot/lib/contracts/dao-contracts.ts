import { COMPASS_TOKEN_ABI, FEEDBACK_AUTHENTICATION_DAO_ABI } from './dao-abis';
import daoConfig from './dao-config.json';

// Contract addresses from Arbitrum Sepolia deployment
export const CONTRACT_ADDRESSES = {
  COMPASS_TOKEN: daoConfig.compassToken as `0x${string}`,
  FEEDBACK_AUTHENTICATION_DAO: daoConfig.feedbackAuthenticationDAO as `0x${string}`,
  IDENTITY_REGISTRY: daoConfig.identityRegistry as `0x${string}`,
  REPUTATION_REGISTRY: daoConfig.reputationRegistry as `0x${string}`,
} as const;

// Chain configuration
export const CHAIN_CONFIG = {
  chainId: daoConfig.chainId,
  name: daoConfig.network,
} as const;

// Contract configurations for wagmi
export const COMPASS_TOKEN_CONFIG = {
  address: CONTRACT_ADDRESSES.COMPASS_TOKEN,
  abi: COMPASS_TOKEN_ABI,
} as const;

export const FEEDBACK_AUTHENTICATION_DAO_CONFIG = {
  address: CONTRACT_ADDRESSES.FEEDBACK_AUTHENTICATION_DAO,
  abi: FEEDBACK_AUTHENTICATION_DAO_ABI,
} as const;

// Enums for type safety
export enum AuthenticationStatus {
  Pending = 0,
  Contested = 1,
  Authenticated = 2,
  Rejected = 3,
}

export enum VoteChoice {
  None = 0,
  Legitimate = 1,
  NotLegitimate = 2,
}
