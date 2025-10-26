'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { COMPASS_TOKEN_CONFIG, FEEDBACK_AUTHENTICATION_DAO_CONFIG, AuthenticationStatus, VoteChoice } from '@/lib/contracts/dao-contracts';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface DAOStatus {
  isMember: boolean;
  memberCount: number;
  treasuryBalance: string;
  compassBalance: string;
  isLoading: boolean;
  error?: string;
}

export interface PendingAuthentication {
  authId: number;
  staker: string;
  stakeAmount: string;
  startTime: number;
  agentId: number;
  clientAddress: string;
  feedbackIndex: number;
  status: AuthenticationStatus;
}

export function useDAO() {
  const { address, isConnected } = useAccount();
  const [isJoining, setIsJoining] = useState(false);
  const [devMode, setDevMode] = useState(false);
  
  // Development mode - simulate connected wallet
  const devAddress = '0x1234567890123456789012345678901234567890';
  const isDevConnected = devMode && !isConnected;
  const effectiveAddress = isDevConnected ? devAddress : address;
  const effectiveIsConnected = isConnected || isDevConnected;

  // Read contract functions
  const { data: isMember, isLoading: isMemberLoading, error: isMemberError } = useReadContract({
    ...FEEDBACK_AUTHENTICATION_DAO_CONFIG,
    functionName: 'isMember',
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: {
      enabled: !!effectiveAddress,
    },
  });

  const { data: memberCount, isLoading: isMemberCountLoading } = useReadContract({
    ...FEEDBACK_AUTHENTICATION_DAO_CONFIG,
    functionName: 'getMemberCount',
  });

  const { data: treasuryBalance, isLoading: isTreasuryLoading } = useReadContract({
    ...FEEDBACK_AUTHENTICATION_DAO_CONFIG,
    functionName: 'getTreasuryBalance',
  });

  const { data: compassBalance, isLoading: isCompassLoading } = useReadContract({
    ...COMPASS_TOKEN_CONFIG,
    functionName: 'balanceOf',
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: {
      enabled: !!effectiveAddress,
    },
  });

  // Write contract functions
  const { writeContract: writeContractDAO, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Join DAO function
  const joinDAO = useCallback(async () => {
    if (!effectiveAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (isMember) {
      toast.error('You are already a DAO member');
      return;
    }

    if (isDevConnected) {
      // Development mode - simulate joining
      toast.success('Development mode: Simulated joining DAO!', { id: 'join-dao' });
      return;
    }

    try {
      setIsJoining(true);
      toast.loading('Joining DAO...', { id: 'join-dao' });

      await writeContractDAO({
        ...FEEDBACK_AUTHENTICATION_DAO_CONFIG,
        functionName: 'joinDAO',
      });

      toast.success('Transaction submitted! Waiting for confirmation...', { id: 'join-dao' });
    } catch (error) {
      console.error('Error joining DAO:', error);
      toast.error('Failed to join DAO. Please try again.', { id: 'join-dao' });
    } finally {
      setIsJoining(false);
    }
  }, [effectiveAddress, isMember, writeContractDAO, isDevConnected]);

  // Mock functions for UI demonstration
  const authenticateFeedback = useCallback(async (agentId: number, clientAddress: string, feedbackIndex: number, stakeAmount: string) => {
    toast.success(`Mock: Would authenticate feedback for agent ${agentId} with stake ${stakeAmount} COMPASS`, {
      duration: 4000,
    });
  }, []);

  const contestAuthentication = useCallback(async (authId: number, stakeAmount: string) => {
    toast.success(`Mock: Would contest authentication ${authId} with stake ${stakeAmount} COMPASS`, {
      duration: 4000,
    });
  }, []);

  const voteOnContestation = useCallback(async (authId: number, choice: VoteChoice, stakeAmount: string) => {
    const choiceText = choice === VoteChoice.Legitimate ? 'Legitimate' : 'Not Legitimate';
    toast.success(`Mock: Would vote ${choiceText} on contestation ${authId} with stake ${stakeAmount} COMPASS`, {
      duration: 4000,
    });
  }, []);

  // Format balance for display
  const formatBalance = (balance: bigint | undefined, decimals: number = 18): string => {
    if (!balance) return '0';
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const remainder = balance % divisor;
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmed = remainderStr.replace(/0+$/, '');
    return trimmed ? `${whole}.${trimmed}` : whole.toString();
  };

  // Compute DAO status
  const daoStatus: DAOStatus = {
    isMember: isDevConnected ? true : Boolean(isMember), // Simulate member in dev mode
    memberCount: isDevConnected ? 42 : Number(memberCount || 0), // Mock member count
    treasuryBalance: isDevConnected ? '1,250,000' : formatBalance(treasuryBalance), // Mock treasury
    compassBalance: isDevConnected ? '5,000' : formatBalance(compassBalance), // Mock user balance
    isLoading: isDevConnected ? false : (isMemberLoading || isMemberCountLoading || isTreasuryLoading || isCompassLoading),
    error: isDevConnected ? undefined : (isMemberError?.message || writeError?.message),
  };

  return {
    // Status
    daoStatus,
    isConnected: effectiveIsConnected,
    address: effectiveAddress,
    
    // Development mode
    devMode,
    setDevMode,
    isDevConnected,
    
    // Loading states
    isJoining,
    isWritePending,
    isConfirming,
    isConfirmed,
    
    // Functions
    joinDAO,
    authenticateFeedback,
    contestAuthentication,
    voteOnContestation,
  };
}
