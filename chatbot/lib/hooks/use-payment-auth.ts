'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { createWalletClient, http, type WalletClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { arbitrumSepolia } from 'viem/chains'

export interface PaymentInfo {
  amount: string
  currency: string
  recipient: string
  chainId?: number
  nonce?: number
  deadline?: number
  network?: string
  description?: string
}

// Use a local test private key (for development only!)
const TEST_PRIVATE_KEY = process.env.NEXT_PUBLIC_TEST_PRIVATE_KEY

export function usePaymentAuth() {
  const [isConnecting, setIsConnecting] = useState(false)
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  // Fallback to local private key if no wallet connected
  const account = TEST_PRIVATE_KEY ? privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`) : null
  const fallbackWalletClient = account ? createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http()
  }) : null

  const connectWallet = useCallback(async () => {
    if (isConnected && address) {
      console.log('Wallet connected:', address)
      return address
    }
    
    if (account) {
      console.log('Using local wallet:', account.address)
      return account.address
    }
    
    throw new Error('No wallet connected and no local key available')
  }, [address, isConnected, account])

  const generateSignature = useCallback(
    async (paymentInfo: PaymentInfo): Promise<string> => {
      setIsConnecting(true)
      try {
        // If wallet is connected via wagmi, use the wagmi wallet client
        if (isConnected && walletClient && address) {
          // Get the current chain ID from the wallet client
          const currentChainId = await walletClient.getChainId()
          
          // EIP-712 domain
          const domain = {
            name: 'x402',
            version: '1',
            chainId: paymentInfo.chainId || currentChainId, // Use current chain ID or provided chain ID
            verifyingContract: paymentInfo.recipient as `0x${string}`
          } as const

          // EIP-712 types
          const types = {
            PaymentAuthorization: [
              { name: 'amount', type: 'uint256' },
              { name: 'currency', type: 'string' },
              { name: 'recipient', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' }
            ]
          } as const

          // Convert amount to smallest unit (USDC has 6 decimals)
          const amountInUnits = Math.floor(parseFloat(paymentInfo.amount) * 1_000_000)

          // Generate nonce and deadline if not provided
          const nonce = paymentInfo.nonce || Math.floor(Date.now() / 1000)
          const deadline = paymentInfo.deadline || Math.floor(Date.now() / 1000) + 3600

          // Message to sign
          const message = {
            amount: BigInt(amountInUnits),
            currency: paymentInfo.currency,
            recipient: paymentInfo.recipient as `0x${string}`,
            nonce: BigInt(nonce),
            deadline: BigInt(deadline)
          } as const

          // Sign typed data using wagmi wallet client
          const signature = await walletClient.signTypedData({
            account: address as `0x${string}`,
            domain,
            types,
            primaryType: 'PaymentAuthorization',
            message
          })

          return signature
        }
        
        // Fallback to local private key
        if (fallbackWalletClient && account) {
          // Get the current chain ID from the fallback wallet client
          const currentChainId = await fallbackWalletClient.getChainId()
          
          // EIP-712 domain
          const domain = {
            name: 'x402',
            version: '1',
            chainId: paymentInfo.chainId || currentChainId,
            verifyingContract: paymentInfo.recipient as `0x${string}`
          } as const

          // EIP-712 types
          const types = {
            PaymentAuthorization: [
              { name: 'amount', type: 'uint256' },
              { name: 'currency', type: 'string' },
              { name: 'recipient', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' }
            ]
          } as const

          // Convert amount to smallest unit
          const amountInUnits = Math.floor(parseFloat(paymentInfo.amount) * 1_000_000)
          const nonce = paymentInfo.nonce || Math.floor(Date.now() / 1000)
          const deadline = paymentInfo.deadline || Math.floor(Date.now() / 1000) + 3600

          const message = {
            amount: BigInt(amountInUnits),
            currency: paymentInfo.currency,
            recipient: paymentInfo.recipient as `0x${string}`,
            nonce: BigInt(nonce),
            deadline: BigInt(deadline)
          } as const

          const signature = await fallbackWalletClient.signTypedData({
            account,
            domain,
            types,
            primaryType: 'PaymentAuthorization',
            message
          })

          return signature
        }

        throw new Error('No wallet client available for signing')
      } catch (error) {
        console.error('Failed to sign payment:', error)
        throw error
      } finally {
        setIsConnecting(false)
      }
    },
    [walletClient, fallbackWalletClient, account, address, isConnected]
  )

  const disconnect = useCallback(() => {
    // No need to disconnect - local key
  }, [])

  return {
    walletClient: (walletClient || fallbackWalletClient) as WalletClient | undefined,
    address: address || account?.address,
    isConnecting,
    connectWallet,
    generateSignature,
    disconnect
  }
}
